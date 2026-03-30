"""
Обработка заявок: создание, проверка оплаты, подтверждение тренером, чат, email-уведомления.
"""
import json
import os
import smtplib
import psycopg2
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart


def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])


def handler(event: dict, context) -> dict:
    cors = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
    }

    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": cors, "body": ""}

    method = event.get("httpMethod", "GET")
    params = event.get("queryStringParameters") or {}
    action = params.get("action", "create")
    body = {}
    if event.get("body"):
        body = json.loads(event["body"])

    # POST ?action=create — создать заявку
    if method == "POST" and action == "create":
        conn = get_conn()
        cur = conn.cursor()
        cur.execute(
            """
            INSERT INTO orders (name, phone, email, age, height, weight, activity_level, goal, equipment, notes)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
            """,
            (
                body.get("name", ""),
                body.get("phone", ""),
                body.get("email", ""),
                body.get("age"),
                body.get("height"),
                body.get("weight"),
                body.get("activity_level", ""),
                body.get("goal", ""),
                body.get("equipment", ""),
                body.get("notes", ""),
            ),
        )
        order_id = cur.fetchone()[0]
        conn.commit()
        cur.close()
        conn.close()

        # Уведомление тренеру о новой заявке
        _send_email(
            subject=f"Новая заявка #{order_id} — Форма Жизни",
            body=f"""Новая заявка на сайте!

Заявка #{order_id}
Имя: {body.get('name', '')}
Телефон: {body.get('phone', '')}
Email: {body.get('email', '')}
Возраст: {body.get('age')} лет
Рост: {body.get('height')} см
Вес: {body.get('weight')} кг
Активность: {body.get('activity_level', '')}
Цель: {body.get('goal', '')}
Инвентарь: {body.get('equipment', '')}
Примечания: {body.get('notes', '')}

Ожидает оплаты. Проверь и подтверди в панели тренера."""
        )

        return {
            "statusCode": 200,
            "headers": cors,
            "body": json.dumps({"order_id": order_id}),
        }

    # POST ?action=claim_paid — клиент нажал "я оплатил", меняем статус на awaiting_confirm
    if method == "POST" and action == "claim_paid":
        order_id = body.get("order_id")
        conn = get_conn()
        cur = conn.cursor()
        cur.execute(
            "UPDATE orders SET payment_status='awaiting_confirm' WHERE id=%s AND payment_status='pending' RETURNING id, name, phone, email, goal",
            (order_id,),
        )
        row = cur.fetchone()
        conn.commit()
        cur.close()
        conn.close()

        if row:
            # Уведомление тренеру — клиент говорит что оплатил
            _send_email(
                subject=f"Клиент сообщил об оплате — заявка #{order_id}",
                body=f"""Клиент нажал «Я оплатил»!

Заявка #{order_id}
Имя: {row[1]}
Телефон: {row[2]}
Email: {row[3]}
Цель: {row[4]}

Проверь поступление 300 руб. в Т-Банке и подтверди заявку в панели тренера."""
            )
            return {
                "statusCode": 200,
                "headers": cors,
                "body": json.dumps({"ok": True, "status": "awaiting_confirm"}),
            }
        else:
            # Заявка уже была обработана или не найдена
            cur2 = get_conn().cursor()
            conn2 = get_conn()
            cur2 = conn2.cursor()
            cur2.execute("SELECT payment_status FROM orders WHERE id=%s", (order_id,))
            existing = cur2.fetchone()
            cur2.close()
            conn2.close()
            current_status = existing[0] if existing else "not_found"
            return {
                "statusCode": 200,
                "headers": cors,
                "body": json.dumps({"ok": False, "status": current_status}),
            }

    # GET ?action=check_payment&order_id=X — проверить статус оплаты (полинг с фронта)
    if method == "GET" and action == "check_payment":
        order_id = params.get("order_id")
        conn = get_conn()
        cur = conn.cursor()
        cur.execute("SELECT payment_status FROM orders WHERE id=%s", (order_id,))
        row = cur.fetchone()
        cur.close()
        conn.close()
        status = row[0] if row else "not_found"
        return {
            "statusCode": 200,
            "headers": cors,
            "body": json.dumps({"status": status}),
        }

    # POST ?action=confirm_payment — тренер подтверждает оплату (из панели)
    if method == "POST" and action == "confirm_payment":
        order_id = body.get("order_id")
        conn = get_conn()
        cur = conn.cursor()
        cur.execute(
            "UPDATE orders SET payment_status='paid' WHERE id=%s RETURNING id, name, phone, email, goal",
            (order_id,),
        )
        row = cur.fetchone()
        conn.commit()
        if row:
            cur.execute(
                "INSERT INTO chat_messages (order_id, sender, message) VALUES (%s, %s, %s)",
                (order_id, "manager", f"Привет, {row[1]}! Оплата подтверждена. Я уже работаю над твоим персональным планом — он будет готов в течение 24 часов. Если есть вопросы — пиши сюда!"),
            )
            conn.commit()
        cur.close()
        conn.close()
        return {
            "statusCode": 200,
            "headers": cors,
            "body": json.dumps({"ok": True}),
        }

    # GET ?action=chat&order_id=X — получить сообщения чата
    if method == "GET" and action == "chat":
        order_id = params.get("order_id")
        conn = get_conn()
        cur = conn.cursor()
        cur.execute(
            "SELECT id, sender, message, created_at FROM chat_messages WHERE order_id=%s ORDER BY created_at ASC",
            (order_id,),
        )
        rows = cur.fetchall()
        cur.close()
        conn.close()
        messages = [
            {"id": r[0], "sender": r[1], "message": r[2], "created_at": r[3].isoformat()}
            for r in rows
        ]
        return {
            "statusCode": 200,
            "headers": cors,
            "body": json.dumps({"messages": messages}),
        }

    # POST ?action=send_message — отправить сообщение в чат
    if method == "POST" and action == "send_message":
        conn = get_conn()
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO chat_messages (order_id, sender, message) VALUES (%s, %s, %s) RETURNING id",
            (body.get("order_id"), body.get("sender", "user"), body.get("message", "")),
        )
        msg_id = cur.fetchone()[0]
        conn.commit()
        cur.close()
        conn.close()
        return {
            "statusCode": 200,
            "headers": cors,
            "body": json.dumps({"ok": True, "id": msg_id}),
        }

    # GET ?action=admin — все заявки для менеджера
    if method == "GET" and action == "admin":
        conn = get_conn()
        cur = conn.cursor()
        cur.execute(
            "SELECT id, name, phone, email, age, height, weight, activity_level, goal, equipment, notes, payment_status, created_at FROM orders ORDER BY created_at DESC"
        )
        rows = cur.fetchall()
        cur.close()
        conn.close()
        orders = [
            {
                "id": r[0], "name": r[1], "phone": r[2], "email": r[3],
                "age": r[4], "height": r[5], "weight": str(r[6]) if r[6] else None,
                "activity_level": r[7], "goal": r[8], "equipment": r[9],
                "notes": r[10], "payment_status": r[11],
                "created_at": r[12].isoformat(),
            }
            for r in rows
        ]
        return {
            "statusCode": 200,
            "headers": cors,
            "body": json.dumps({"orders": orders}),
        }

    return {"statusCode": 404, "headers": cors, "body": json.dumps({"error": "not found"})}


def _send_email(subject: str, body: str):
    """Отправка email через SMTP mail.ru"""
    smtp_password = os.environ.get("SMTP_PASSWORD", "")
    notify_email = os.environ.get("EMAIL_NOTIFY", "tanks.674@mail.ru")

    if not smtp_password:
        print(f"[EMAIL SKIP] SMTP_PASSWORD не задан. Тема: {subject}")
        return

    try:
        msg = MIMEMultipart()
        msg["From"] = notify_email
        msg["To"] = notify_email
        msg["Subject"] = subject
        msg.attach(MIMEText(body, "plain", "utf-8"))

        with smtplib.SMTP_SSL("smtp.mail.ru", 465) as server:
            server.login(notify_email, smtp_password)
            server.send_message(msg)

        print(f"[EMAIL OK] Отправлено: {subject}")
    except Exception as e:
        print(f"[EMAIL ERROR] {e}")
