# Ellas Cupcakery CRM - Video Submission Script & Workflow Breakdown

## **1. Introduction**
**Narrator:** "Welcome to the Ellas Cupcakery CRM, an AI-powered customer relationship management system designed specifically for bakery businesses. This project integrates a robust backend agent with a seamless React frontend to automate customer interactions, process orders, and manage data efficiently."

---

## **2. The AI Agent: "El-Intel" (The Core Intelligence)**
**Narrator:** "At the heart of our system is 'El-Intel', built using LangGraph and Groq's LLM engine. Unlike generic chatbots, El-Intel is designed with a strict **'Direct Cashier' persona.**"

**Key Features to Highlight:**
*   **Strict Protocol:** The agent avoids unnecessary small talk and filler words ("I am checking..."), focusing purely on efficiency.
*   **Hallucination Prevention:** It strictly adheres to the predefined menu and price list, ensuring no fake items or incorrect prices are quoted.
*   **Context Awareness:** It distinguishes between 'New Customers' (prompting for a name) and 'Returning Customers' (remembering loyalty points and history).

**Visual:** Show the code snippet in `agents/agent_core.py` where `SYSTEM_PROTOCOL` and `FORBIDDEN_PHRASES` are defined to enforce this behavior.

---

## **3. Customer User Journey (The Frontend)**
**Narrator:** "Let's walk through the customer experience."

### **Step A: Onboarding**
*   **Action:** Open the Customer Chat Interface for a new user.
*   **Workflow:**
    1.  The system detects a new `user_id`.
    2.  **Agent Action:** The agent immediately recognizes the profile as "New Customer".
    3.  **Agent Response:** "Welcome! May I have your name for the order?" (Skipping small talk).
    4.  **Data Persistence:** Once the user provides a name, the `UpdateCustomerProfile` tool runs in the background, saving their identity to `mock_data.py`.

### **Step B: Menu & Ordering**
*   **Action:** User types "What's on your menu?" or "Order a Red Velvet Cupcake".
*   **Workflow:**
    1.  **Intent Classification:** The agent analyzes the query. Keywords like "Menu" or "Price" trigger the `GetMenuAndPrice` tool.
    2.  **Direct Response:** The agent lists items concisely with prices.
    3.  **Ordering:** When the user selects an item, the `ProcessOrder` tool is triggered.
    4.  **Anti-Hallucination Check:** The tool performs a fuzzy search. If the user says "Chocolate", and there are multiple chocolate items, the tool returns an error asking for clarification instead of guessing.

### **Step C: Checkout & Payment**
*   **Action:** User confirms the order.
*   **Workflow:**
    1.  **Strict Payment Flow:** The agent does *not* ask "Cash or Card?".
    2.  **Immediate Instruction:** It immediately responds with: *"Order created. Total: ₦850.00. Please transfer to [Bank Details] to confirm."*
    3.  **Backend Update:** The order is saved to the database with status `Pending Payment`.

---

## **4. The Vendor Dashboard (Backend Management)**
**Narrator:** "While the AI handles the front-of-house, the Vendor Dashboard manages the business."

*   **Kanban Board:** Show the real-time order board.
    *   **Feature:** Orders placed in the chat appear here instantly.
    *   **Workflow:** The vendor sees "Pending Payment" orders. Once the transfer is confirmed, they drag the card to "Paid" or "Out for Delivery".
*   **Customer Insights:** Show the database view.
    *   **Feature:** View customer loyalty points and `last_order_date` (which is automatically updated by the `crm_tools.py` logic upon every order).

---

## **5. Technical Architecture (Under the Hood)**
**Narrator:** "Technically, the system uses a graph-based workflow:"

1.  **Node 1: Identify User** – Loads profile from persistent storage.
2.  **Node 2: Intent Classifier** – A robust LLM call that decides if a tool is needed.
3.  **Node 3: Tool Executor** – Safely executes Python functions (Ordering, Profile Update).
4.  **Node 4: Response Generator** – Synthesizes the final answer using strict "Robotically Efficient" guidelines.

---

## **6. Conclusion**
**Narrator:** "Ellas Cupcakery CRM demonstrates how specialized AI agents can replace traditional form-based ordering systems with conversational, efficient, and error-free interactions."
