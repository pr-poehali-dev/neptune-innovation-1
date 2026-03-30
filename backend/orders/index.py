"""
Обработка заявок: создание, проверка оплаты, подтверждение тренером, чат, уведомления в Telegram.
"""
import json
import os
import urllib.request
import urllib.error
import psycopg2


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

        _send_email(
            subject=f"📋 Новая заявка #{order_id} — Форма Жизни",
            html=f"""
<h2>Новая заявка #{order_id}</h2>
<table style="border-collapse:collapse;width:100%">
  <tr><td style="padding:6px;color:#888">Имя</td><td style="padding:6px;font-weight:bold">{body.get('name','')}</td></tr>
  <tr><td style="padding:6px;color:#888">Телефон</td><td style="padding:6px;font-weight:bold">{body.get('phone','')}</td></tr>
  <tr><td style="padding:6px;color:#888">Email</td><td style="padding:6px">{body.get('email','')}</td></tr>
  <tr><td style="padding:6px;color:#888">Возраст</td><td style="padding:6px">{body.get('age')} лет</td></tr>
  <tr><td style="padding:6px;color:#888">Рост / Вес</td><td style="padding:6px">{body.get('height')} см / {body.get('weight')} кг</td></tr>
  <tr><td style="padding:6px;color:#888">Активность</td><td style="padding:6px">{body.get('activity_level','')}</td></tr>
  <tr><td style="padding:6px;color:#888">Цель</td><td style="padding:6px">{body.get('goal','')}</td></tr>
  <tr><td style="padding:6px;color:#888">Инвентарь</td><td style="padding:6px">{body.get('equipment','')}</td></tr>
  <tr><td style="padding:6px;color:#888">Примечания</td><td style="padding:6px">{body.get('notes','')}</td></tr>
</table>
<p style="color:#888;margin-top:16px">Статус: ожидает оплаты</p>
"""
        )

        return {
            "statusCode": 200,
            "headers": cors,
            "body": json.dumps({"order_id": order_id}),
        }

    # POST ?action=claim_paid — клиент нажал "я оплатил"
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
            _send_email(
                subject=f"💰 Клиент сообщил об оплате — заявка #{order_id}",
                html=f"""
<h2>Клиент нажал «Я оплатил»!</h2>
<p><b>Заявка #{order_id}</b></p>
<p>Имя: <b>{row[1]}</b></p>
<p>Телефон: <b>{row[2]}</b></p>
<p>Email: {row[3]}</p>
<p>Цель: {row[4]}</p>
<hr>
<p style="color:#e53e3e"><b>Проверь поступление 300 ₽ в Т-Банке.</b><br>
После проверки подтверди оплату в панели тренера, чтобы открылся чат с клиентом.</p>
"""
            )
            return {
                "statusCode": 200,
                "headers": cors,
                "body": json.dumps({"ok": True, "status": "awaiting_confirm"}),
            }
        else:
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

    # GET ?action=check_payment&order_id=X — проверить статус
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

    # POST ?action=confirm_payment — тренер подтверждает оплату
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

    # GET ?action=chat&order_id=X
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

    # POST ?action=send_message
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

    # GET ?action=admin
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


def _send_email(subject: str, html: str):
    """Отправка уведомления в Telegram"""
    token = os.environ.get("TELEGRAM_BOT_TOKEN", "")
    chat_id = os.environ.get("TELEGRAM_CHAT_ID", "")

    if not token or not chat_id:
        print(f"[TG SKIP] Токен или chat_id не заданы. Тема: {subject}")
        return

    # Конвертируем HTML в простой текст для Telegram
    import re
    text = re.sub(r"<[^>]+>", "", html)
    text = re.sub(r"\n{3,}", "\n\n", text).strip()
    message = f"*{subject}*\n\n{text}"

    payload = json.dumps({
        "chat_id": chat_id,
        "text": message,
        "parse_mode": "Markdown",
    }).encode("utf-8")

    req = urllib.request.Request(
        f"https://api.telegram.org/bot{token}/sendMessage",
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        with urllib.request.urlopen(req) as resp:
            print(f"[TG OK] Уведомление отправлено: {subject}")
    except urllib.error.HTTPError as e:
        print(f"[TG ERROR] {e.code}: {e.read().decode()}")
    except Exception as e:
        print(f"[TG ERROR] {e}")