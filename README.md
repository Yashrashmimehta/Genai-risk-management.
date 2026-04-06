# GenAI Project Risk Management System

An AI-powered full-stack web application that monitors, analyzes, and predicts project risks in real time using a multi-agent architecture.

---

## Project Overview

This system helps organizations track project risks based on real-time parameters like:

- Schedule delay
- Payment status
- Resource availability

It dynamically updates:

-  Risk levels (Low / Medium / High)
-  Dashboard analytics
-  AI chatbot insights
-  Active project tracking

---

## Features

-  Real-time project risk analysis
-  Dynamic dashboard updates
-  Multi-agent architecture simulation
-  AI-based chatbot for risk insights
-  Interactive frontend (React + Vite)
-  REST API backend (Flask)

---

##  Tech Stack

### Frontend:
- React (Vite)
- TypeScript
- HTML/CSS

### Backend:
- Python
- Flask
- Flask-CORS
- AI Layer - Crew AI

---

##  System Architecture (Agents)

The system is designed using a simulated multi-agent architecture:

-  Risk Scoring Agent  
  Calculates project risk based on input parameters  

-  Project Tracking Agent  
  Stores and manages active projects  

-  Reporting Agent  
  Displays risk analytics and insights  

-  Visualization Agent  
  Updates charts and dashboard  

-  Chatbot Agent  
  Provides intelligent responses based on project data  

---

##  How It Works

1. User enters project details
2. Frontend sends data to backend API
3. CrewAi calculated the risk
4. Updated project list is returned
5. Frontend updates:
   - Active projects table
   - Risk distribution graph
   - Chatbot insights

---
## Project Structure
|-----backend/
|  |---app.py
|  |---requirements.txt
|
|-----frontend/
|  |---arc/
|  |---public/
|  |---package.json

---

##  Deployment
- Render (Frontend + Backend)

---

## Live Demo
Frontend - (https://genai-risk-management-1-kg15.onrender.com/)
Backend  - https://genai-risk-management-7ea9.onrender.com

##  Future Improvements

-  Integration with real AI models (OpenAI / LLMs)
-  Database support (MongoDB / PostgreSQL)
-  Authentication system
-  Advanced predictive analytics
-  Real-time notifications

---

##  Conclusion

This project demonstrates how AI and full-stack development can be combined to build an intelligent risk monitoring system for modern organizations.

---

##  Author

Developed by: Rashi Ranjan, Monikonkona Ray, Yash Mehta, Akhtaruzzaman

---

