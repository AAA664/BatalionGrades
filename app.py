from flask import Flask, request, jsonify
import os
import requests
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()  # optional if using .env for keys

app = Flask(__name__)

# Supabase credentials
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)


@app.route("/submit-grade", methods=["POST"])
def submit_grade():
    data = request.json
    user_id = data["user_id"]
    course_id = data["course_id"]
    grade = data["grade"]

    # Optional: prevent duplicate entry for same user-course
    existing = supabase.table("grades").select("*").eq("user_id", user_id).eq("course_id", course_id).execute()
    if existing.data:
        return jsonify({"error": "Grade already submitted for this course"}), 400

    result = supabase.table("grades").insert({
        "user_id": user_id,
        "course_id": course_id,
        "grade": grade
    }).execute()

    if result.error:
        return jsonify({"error": result.error.message}), 500
    return jsonify({"status": "success"})


@app.route("/rankings", methods=["GET"])
def rankings():
    grades = supabase.table("grades").select("*").execute().data
    courses = supabase.table("courses").select("id, credit").execute().data

    course_credit_map = {c["id"]: float(c["credit"]) for c in courses}

    # Aggregate weighted scores
    users = {}
    for g in grades:
        uid = g["user_id"]
        cid = g["course_id"]
        grade = float(g["grade"])
        credit = course_credit_map.get(cid, 1)

        if uid not in users:
            users[uid] = {"total": 0, "credits": 0}

        users[uid]["total"] += grade * credit
        users[uid]["credits"] += credit

    # Calculate weighted averages
    results = []
    for uid, info in users.items():
        avg = info["total"] / info["credits"] if info["credits"] else 0
        results.append({"user_id": uid, "weighted_average": round(avg, 2)})

    # Sort by rank
    ranked = sorted(results, key=lambda x: x["weighted_average"], reverse=True)
    for i, entry in enumerate(ranked):
        entry["rank"] = i + 1

    return jsonify(ranked)


@app.route("/courses", methods=["GET"])
def courses():
    data = supabase.table("courses").select("id, name, credit").execute()
    return jsonify(data.data)


if __name__ == "__main__":
    app.run(debug=True)
