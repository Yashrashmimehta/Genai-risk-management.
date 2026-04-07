from groq_service import get_ai_completion

def generate_report(project_name, risk_level, risks):
    """
    Generate a professional AI project risk report using Groq.
    """
    prompt = f"""
    Generate a professional analysis for this project risk:
    
    Project Name: {project_name}
    Verdict: {risk_level}
    Risks Identified: {risks}
    
    Structure:
    1. Executive Summary
    2. Deep Dive Analysis
    3. Mitigation Checklist (Short, Actionable)
    """

    system_message = "You are a Senior Strategic Risk Reporting Agent."
    return get_ai_completion(prompt, system_message)