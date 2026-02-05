"use client";

import { useApp } from "@/app/providers";
import { Brain, MessageCircle } from "lucide-react";
import { useState } from "react";
import AdvancedChatbot from "./AdvancedChatbot";

export default function AdvancedChatButton() {
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useApp();

  // Only show chat button if user is authenticated
  if (!user) {
    return null;
  }

  return (
    <>
      {/* Floating Chat Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 z-40 group"
        aria-label="Open Advanced AI Assistant"
      >
        <MessageCircle className="w-6 h-6" />
        <div className="absolute -top-2 -right-2 bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 text-xs px-2 py-1 rounded-full font-bold flex items-center space-x-1">
          <Brain className="w-3 h-3" />
          <span>AI</span>
        </div>
      </button>

      {/* Advanced Chatbot Modal */}
      <AdvancedChatbot isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
