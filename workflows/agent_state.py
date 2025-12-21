from typing import TypedDict, List, Dict, Any, Annotated
from langchain_core.messages import BaseMessage
import operator

class AgentState(TypedDict):
    user_id: str
    input_query: str
    chat_history: List[BaseMessage]
    customer_profile: Dict[str, Any]
    tools_to_run: List[Dict[str, Any]]
    tool_output: List[Any]  # Can be list of strings or JSON structures
    intent: str
    final_response: str
