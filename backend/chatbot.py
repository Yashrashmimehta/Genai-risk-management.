from groq_service import get_ai_completion
from database import connect_db

def chatbot_query(question):
    """
    Handle questions using Groq for smart, conversational analyst responses.
    """
    conn  = connect_db()
    cur   = conn.cursor()
    cur.execute("SELECT * FROM projects")
    data  = cur.fetchall()
    conn.close()

    # Build context for the AI
    project_context = "Current projects being monitored:\n"
    for p in data:
        project_context += f"- {p[1]} (id={p[0]}, delay={p[3]}d, payment={p[4]}, resources={p[5]})\n"

    prompt = f"""
    Context: {project_context}
    
    Question from user: {question}
    
    Respond as a helpful, expert project risk analyst using the project data provided.
    Answer concisely and professional. Use markdown.
    """

    system_message = "You are a professional AI Analyst for SENTINEL Risk Monitor."
    return get_ai_completion(prompt, system_message)