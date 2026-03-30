"""
Обработка заявок: создание, подтверждение оплаты, чат с менеджером.
"""
import json
import os
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
        return {
            "statusCode": 200,
            "headers": cors,
            "body": json.dumps({"order_id": order_id}),
        }

    # POST ?action=confirm — подтвердить оплату
    if method == "POST" and action == "confirm":
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
                (order_id, "manager", f"Привет, {row[1]}! Твоя оплата получена. Я уже работаю над твоим персональным планом — он будет готов в течение 24 часов. Если есть вопросы — пиши сюда!"),
            )
            conn.commit()
        cur.close()
        conn.close()
        if row:
            _log_notify(row, order_id)
        return {
            "statusCode": 200,
            "headers": cors,
            "body": json.dumps({"ok": True, "order_id": order_id}),
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


def _log_notify(row, order_id):
    email = os.environ.get("EMAIL_NOTIFY", "")
    print(f"[NOTIFY] Новая оплата #{order_id} | {row[1]} | тел: {row[2]} | email: {row[3]} | цель: {row[4]} | уведомить: {email}")
