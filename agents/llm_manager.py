from langchain_openai import ChatOpenAI
from config import CRM_CONFIG
import time

def get_llm_for_provider(provider):
    """Creates a ChatOpenAI instance for a specific provider."""
    return ChatOpenAI(
        base_url=provider['base_url'],
        api_key=provider['key'],
        model=provider['model'],
        temperature=0,
        max_retries=1, # We handle retries at the provider level
        timeout=30.0
    )

def robust_llm_invoke(prompt_value, tools=None):
    """
    Attempts to invoke the LLM using the list of providers in CRM_CONFIG.
    Falls back to the next provider on failure.
    """
    last_exception = None
    
    # Filter only providers with keys
    available_providers = [p for p in CRM_CONFIG.PROVIDERS if p['key']]
    
    if not available_providers:
        raise ValueError("No valid LLM providers configured (missing API keys).")

    for i, provider in enumerate(available_providers):
        try:
            print(f"--- LLM Manager: Attempting with {provider['name']} ({provider['model']})...")
            
            llm = get_llm_for_provider(provider)
            
            # Bind tools if supported structure is standard
            if tools:
                llm = llm.bind_tools(tools)
                
            # Invoke directly with the PromptValue
            response = llm.invoke(prompt_value) 
            
            print(f"--- LLM Manager: Success with {provider['name']}")
            return response
            
        except Exception as e:
            print(f"--- LLM Manager: Failed with {provider['name']}: {str(e)}")
            last_exception = e
            # Optional: Add small delay before switch
            # time.sleep(0.5)
            continue
            
    # If all failed
    print("--- LLM Manager: All providers failed.")
    raise last_exception
