from langgraph.graph import StateGraph, END
from workflows.agent_state import AgentState
from agents.agent_core import (
    identify_user_node,
    intent_classifier_node,
    tool_executor_node,
    response_generator_node
)

def router_logic(state: AgentState):
    """
    Decides the next step after the logical intent classification.
    """
    intent = state.get("intent")
    
    if intent == "TOOL_REQUIRED":
        return "tool_executor"
    else:
        # If CONVERSATIONAL or anything else, we might skip to END or response
        # But based on the node design in agent_core, "CONVERSATIONAL" sets final_response
        # checks if we need to generate a response or if it's already done.
        # However, looking at agent_core, if intent is CONVERSATIONAL, it sets final_response.
        # We can just go to END.
        return END

def build_crm_graph(llm_client):
    """
    Builds the LangGraph for the CRM Agent using the defined nodes and conditional logic.
    """
    workflow = StateGraph(AgentState)

    # 1. Add Nodes
    workflow.add_node("identify_user", identify_user_node)
    workflow.add_node("intent_classifier", intent_classifier_node)
    workflow.add_node("tool_executor", tool_executor_node)
    workflow.add_node("response_generator", response_generator_node)

    # 2. Add Edges (The Flow)
    
    # Start -> Identify User
    workflow.set_entry_point("identify_user")
    
    # Identify User -> Intent Classifier
    workflow.add_edge("identify_user", "intent_classifier")
    
    # Intent Classifier -> Conditional (Tool Execution or End/Response)
    workflow.add_conditional_edges(
        "intent_classifier",
        router_logic,
        {
            "tool_executor": "tool_executor",
            END: END
        }
    )
    
    # Tool Executor -> Response Generator
    # After tools run, we always want to generate a final polite response summarizing the action
    workflow.add_edge("tool_executor", "response_generator")
    
    # Response Generator -> End
    workflow.add_edge("response_generator", END)

    # 3. Compile
    app = workflow.compile()
    
    return app