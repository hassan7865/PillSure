"use client"

import React, { useCallback } from "react"
import { toast } from "sonner"
import { CheckCircle, XCircle, Info, User } from "lucide-react"

export function useCustomToast() {
  const showSuccess = useCallback((message: string, description?: string) => {
    toast.success(message, {
      description,
      duration: 4000,
      icon: React.createElement(CheckCircle, { className: "h-4 w-4" }),
    })
  }, [])

  const showError = useCallback((message: string, description?: string) => {
    toast.error(message, {
      description,
      duration: 5000,
      icon: React.createElement(XCircle, { className: "h-4 w-4" }),
    })
  }, [])

  const showInfo = useCallback((message: string, description?: string) => {
    toast.info(message, {
      description,
      duration: 4000,
      icon: React.createElement(Info, { className: "h-4 w-4" }),
    })
  }, [])

  const showWelcomeBack = useCallback((userName?: string) => {
    toast.success("Welcome back!", {
      description: userName ? `Hello ${userName}, great to see you again!` : "Great to see you again!",
      duration: 4000,
      icon: React.createElement(User, { className: "h-4 w-4" }),
    })
  }, [])

  return {
    showSuccess,
    showError,
    showInfo,
    showWelcomeBack,
  }
}
