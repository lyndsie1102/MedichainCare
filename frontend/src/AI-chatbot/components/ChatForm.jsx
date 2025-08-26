import { useRef } from "react";

const ChatForm = ({ chatHistory, setChatHistory, generateBotResponse }) => {
    const inputRef = useRef();

    const handleFormSubmit = (e) => {
        e.preventDefault();
        const userMessage = inputRef.current.value.trim();
        if (!userMessage) return;
        inputRef.current.value = "";

        // Update chat history with user message
        setChatHistory((history) => [...history, { role: "user", text: userMessage }]);

        setTimeout(() => {
            //Add thinking placeholder for bot's response
            setChatHistory((history) => [...history, { role: "model", text: "Thinking..." }]);
            // call th function to generate response
            generateBotResponse([...chatHistory, { role: "user", text: userMessage }]);
        }, 600);

    }

    return (
        <form action="#" className="chat-form" onSubmit={handleFormSubmit}>
            <input ref={inputRef} type="text" placeholder="Message..."
                className="message-input" required />
            <button class="material-symbols-rounded">
                arrow_upward
            </button>
        </form>
    )
}

export default ChatForm