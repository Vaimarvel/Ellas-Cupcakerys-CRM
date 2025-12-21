# config.py
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# --- Brand and Deployment Configuration ---
class Config:
    """Central configuration class for Ellas Cupcakery CRM Agent."""
    
    # Brand Identity (Used in all prompts and UI)
    BRAND_NAME = os.getenv("BRAND_NAME", "Ellas Cupcakery")
    
    # LLM Settings
    GROQ_API_KEY = os.getenv("GROQ_API_KEY")
    # Recommended model for fast, capable tool-calling and reasoning
    GROQ_MODEL_NAME = "llama-3.3-70b-versatile" 
    
    # LLM Provider Fallback List
    PROVIDERS = [
        {
            "name": "Groq",
            "base_url": "https://api.groq.com/openai/v1",
            "key": os.getenv("GROQ_API_KEY"),
            "model": "llama-3.3-70b-versatile" 
        },
        {
            "name": "Cerebras",
            "base_url": "https://api.cerebras.ai/v1",
            "key": os.getenv("CEREBRAS_API_KEY"),
            "model": "llama-3.3-70b" 
        },
        {
            "name": "SambaNova",
            "base_url": "https://api.sambanova.ai/v1",
            "key": os.getenv("SAMBANOVA_API_KEY"),
            "model": "Meta-Llama-3.3-70B-Instruct"
        },
        {
            "name": "Mistral AI",
            "base_url": "https://api.mistral.ai/v1",
            "key": os.getenv("MISTRAL_API_KEY"),
            "model": "open-mistral-nemo"
        },
        {
            "name": "GitHub Models",
            "base_url": "https://models.github.ai/inference",
            "key": os.getenv("GITHUB_TOKEN"),
            "model": "Meta-Llama-3.1-8B-Instruct"
        },
        {
            "name": "Cohere",
            "base_url": "https://api.cohere.ai/compatibility/v1",
            "key": os.getenv("COHERE_API_KEY"),
            "model": "command-r-plus-08-2024"
        },
        {
            "name": "Hugging Face",
            "base_url": "https://api-inference.huggingface.co/models/meta-llama/Meta-Llama-3-8B-Instruct/v1",
            "key": os.getenv("HF_API_KEY"),
            "model": "meta-llama/Meta-Llama-3-8B-Instruct"
        },
    ]

    # Database/Data Source Settings
    # Use this for mock data access and potential future database connection
    DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./data/crm_db.db")
    
    # API Settings
    API_HOST = "0.0.0.0"
    API_PORT = 8000
    
    # System Statuses
    ORDER_STATUSES = ["Processing", "Ready for Delivery", "Out for Delivery", "Completed"]
    CRITICAL_SENTIMENT = ["crisis", "negative"]

    # LLM availability flag: allow app to run without keys for non-LLM endpoints
    LLM_ENABLED = bool(GROQ_API_KEY or any(p.get('key') for p in PROVIDERS))

# Create a single configuration instance
CRM_CONFIG = Config()
