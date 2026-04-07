from groq_service import get_ai_completion

def analyze_project(project):
    """
    Perform a deep AI-powered analysis of a specific project.
    """
    prompt = f"""
    Analyze this project data: {project}
    
    Specific risks:
    - Delay: {project.get('schedule_delay', 0)} days
    - Payment: {project.get('payment_status', 'Unknown')}
    - Resources: {project.get('resource_count', 0)} members
    
    Is this project at risk of failing? Give a 2-sentence expert verdict.
    """

    system_message = "You are a Senior Project Management Consultant."
    return get_ai_completion(prompt, system_message)