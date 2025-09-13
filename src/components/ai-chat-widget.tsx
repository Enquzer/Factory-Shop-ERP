
"use client";

import { useState, useRef, useEffect } from "react";
import { Bot, X, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { productQA } from "@/ai/flows/product-qa-flow";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";

type Message = {
    role: "user" | "bot";
    content: string;
};

export function AiChatWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const scrollAreaRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollAreaRef.current) {
            scrollAreaRef.current.scrollTo({
                top: scrollAreaRef.current.scrollHeight,
                behavior: 'smooth'
            });
        }
    }, [messages]);

    const handleToggle = () => {
        setIsOpen(!isOpen);
        if (!isOpen && messages.length === 0) {
            setMessages([{ role: 'bot', content: 'Hello! How can I help you with our products today?' }]);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage: Message = { role: "user", content: input };
        setMessages((prev) => [...prev, userMessage]);
        setInput("");
        setIsLoading(true);

        try {
            const response = await productQA({ query: input });
            const botMessage: Message = { role: "bot", content: response.answer };
            setMessages((prev) => [...prev, botMessage]);
        } catch (error) {
            console.error("Error calling AI:", error);
            const errorMessage: Message = { role: "bot", content: "Sorry, I'm having trouble connecting. Please try again later." };
            setMessages((prev) => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) {
        return (
            <Button
                className="fixed bottom-6 right-6 h-16 w-16 rounded-full shadow-lg z-50"
                onClick={handleToggle}
            >
                <Bot className="h-8 w-8" />
                <span className="sr-only">Open Chat</span>
            </Button>
        );
    }

    return (
        <Card className="fixed bottom-6 right-6 w-full max-w-sm h-[600px] flex flex-col shadow-xl z-50">
            <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex items-center gap-3">
                    <Avatar>
                        <AvatarFallback>AI</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                        <CardTitle>Product Assistant</CardTitle>
                        <CardDescription>Ask me about inventory</CardDescription>
                    </div>
                </div>
                <Button variant="ghost" size="icon" onClick={handleToggle}>
                    <X className="h-4 w-4" />
                    <span className="sr-only">Close Chat</span>
                </Button>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden">
                <ScrollArea className="h-full pr-4" ref={scrollAreaRef}>
                    <div className="space-y-4">
                        {messages.map((message, index) => (
                            <div key={index} className={`flex gap-3 text-sm ${message.role === 'user' ? 'justify-end' : ''}`}>
                                {message.role === 'bot' && <Avatar className="h-8 w-8"><AvatarFallback>AI</AvatarFallback></Avatar>}
                                <div className={`rounded-lg px-4 py-2 ${message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                                    <p>{message.content}</p>
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex gap-3 text-sm">
                                <Avatar className="h-8 w-8"><AvatarFallback>AI</AvatarFallback></Avatar>
                                <div className="rounded-lg px-4 py-2 bg-muted flex items-center">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                </div>
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </CardContent>
            <CardFooter>
                <form onSubmit={handleSubmit} className="flex w-full items-center space-x-2">
                    <Input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Type your question..."
                        disabled={isLoading}
                        autoFocus
                    />
                    <Button type="submit" disabled={isLoading}>
                        <Send className="h-4 w-4" />
                        <span className="sr-only">Send</span>
                    </Button>
                </form>
            </CardFooter>
        </Card>
    );
}
