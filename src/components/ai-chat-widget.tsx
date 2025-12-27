

"use client";

import { useState, useRef, useEffect } from "react";
import { Bot, X, Send, Loader2, Sparkles, Trash2, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { productQA } from "@/ai/flows/product-qa-flow";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Badge } from "./ui/badge";

type Message = {
    role: "user" | "bot";
    content: string;
    timestamp: Date;
};

export function AiChatWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const scrollAreaRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollAreaRef.current) {
            const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
            if (scrollContainer) {
                scrollContainer.scrollTo({
                    top: scrollContainer.scrollHeight,
                    behavior: 'smooth'
                });
            }
        }
    }, [messages, isLoading]);

    const handleToggle = () => {
        setIsOpen(!isOpen);
        if (!isOpen && messages.length === 0) {
            setMessages([{
                role: 'bot',
                content: 'Hello! I am your Smart Data Assistant. I can help you analyze inventory, check order status, or find sales insights. How can I help you today?',
                timestamp: new Date()
            }]);
        }
    };

    const handleClear = () => {
        setMessages([]);
        setInput("");
    };

    const formatMessage = (content: string) => {
        // Simple markdown-like formatter for bold text
        return content.split(/(\*\*.*?\*\*)/).map((part, i) => {
            if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={i}>{part.slice(2, -2)}</strong>;
            }
            return part;
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage: Message = { role: "user", content: input, timestamp: new Date() };
        setMessages((prev) => [...prev, userMessage]);
        setInput("");
        setIsLoading(true);

        try {
            const response = await productQA({ query: input });
            const botMessage: Message = { role: "bot", content: response.answer, timestamp: new Date() };
            setMessages((prev) => [...prev, botMessage]);
        } catch (error: any) {
            console.error("Error calling AI:", error);
            const botMessage: Message = {
                role: "bot",
                content: `Sorry, I encountered an error: ${error.message || "Unknown error"}. Please check the console for more details.`,
                timestamp: new Date()
            };
            setMessages((prev) => [...prev, botMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) {
        return (
            <Button
                className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-2xl z-50 bg-primary hover:scale-110 transition-all duration-300 group"
                onClick={handleToggle}
            >
                <div className="relative">
                    <Bot className="h-7 w-7 transition-transform group-hover:rotate-12" />
                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-300 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                    </span>
                </div>
                <span className="sr-only">Open Chat</span>
            </Button>
        );
    }

    return (
        <Card className="fixed bottom-6 right-6 flex flex-col shadow-[0_20px_50px_rgba(0,0,0,0.2)] z-50 overflow-hidden border-primary/20 bg-background/95 backdrop-blur-md transition-all duration-500 animate-in fade-in slide-in-from-bottom-10" style={{ width: '400px', height: '600px', maxWidth: '90vw', maxHeight: '80vh' }}>
            <CardHeader className="border-b bg-muted/30 pb-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Avatar className="h-10 w-10 border-2 border-primary/20">
                                <AvatarImage src="/ai-avatar.png" />
                                <AvatarFallback className="bg-primary/10 text-primary">
                                    <Sparkles className="h-5 w-5" />
                                </AvatarFallback>
                            </Avatar>
                            <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-background"></span>
                        </div>
                        <div className="flex flex-col">
                            <CardTitle className="text-lg flex items-center gap-2">
                                Smart Assistant
                                <Badge variant="secondary" className="text-[10px] py-0 px-1 font-normal">Online</Badge>
                            </CardTitle>
                            <CardDescription className="text-xs">Intelligent ERP Insights</CardDescription>
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={handleClear} title="Clear Chat">
                            <Trash2 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleToggle}>
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="flex-1 p-0 overflow-hidden">
                <ScrollArea className="h-full" ref={scrollAreaRef}>
                    <div className="p-4 space-y-4">
                        {messages.map((message, index) => (
                            <div key={index} className={`flex gap-3 mb-2 animate-in fade-in slide-in-from-bottom-2 duration-300 ${message.role === 'user' ? 'justify-end' : ''}`}>
                                {message.role === 'bot' && (
                                    <Avatar className="h-8 w-8 mt-1 border border-primary/10">
                                        <AvatarFallback className="bg-primary/5 text-primary text-[10px]">AI</AvatarFallback>
                                    </Avatar>
                                )}
                                <div className={`group relative max-w-[85%] rounded-2xl px-4 py-2.5 shadow-sm ${message.role === 'user'
                                    ? 'bg-primary text-primary-foreground rounded-tr-none'
                                    : 'bg-muted/50 border border-muted-foreground/10 rounded-tl-none'
                                    }`}>
                                    <div className="text-sm whitespace-pre-wrap leading-relaxed">
                                        {formatMessage(message.content)}
                                    </div>
                                    <span className="text-[9px] opacity-40 mt-1 block">
                                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex gap-3 animate-pulse">
                                <Avatar className="h-8 w-8 border border-primary/10">
                                    <AvatarFallback className="bg-primary/5 text-primary text-[10px]">AI</AvatarFallback>
                                </Avatar>
                                <div className="bg-muted/30 rounded-2xl rounded-tl-none px-4 py-3 flex items-center gap-2">
                                    <div className="flex gap-1">
                                        <span className="h-1.5 w-1.5 bg-primary/40 rounded-full animate-bounce"></span>
                                        <span className="h-1.5 w-1.5 bg-primary/40 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                                        <span className="h-1.5 w-1.5 bg-primary/40 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                                    </div>
                                    <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Analyzing data...</span>
                                </div>
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </CardContent>
            <CardFooter className="p-4 pt-0 border-t bg-muted/10">
                <form onSubmit={handleSubmit} className="flex w-full items-center gap-2 mt-4">
                    <div className="relative flex-1">
                        <Input
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Ask me something about your business..."
                            className="pr-10 bg-background/50 border-primary/10 focus-visible:ring-primary/20 transition-all rounded-xl"
                            disabled={isLoading}
                            autoFocus
                        />
                        <MessageSquare className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground/40 pointer-events-none" />
                    </div>
                    <Button type="submit" size="icon" disabled={isLoading || !input.trim()} className="rounded-xl h-10 w-10 shrink-0 shadow-md hover:shadow-lg transition-all active:scale-95">
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        <span className="sr-only">Send</span>
                    </Button>
                </form>
            </CardFooter>
        </Card>
    );
}

