"use client"

import * as React from "react"
import * as DrawerPrimitive from "@radix-ui/react-dialog"
import { cva } from "class-variance-authority"
import { cn } from "@/lib/utils"

const Drawer = DrawerPrimitive.Root
const DrawerTrigger = DrawerPrimitive.Trigger
const DrawerPortal = DrawerPrimitive.Portal
const DrawerClose = DrawerPrimitive.Close

const DrawerOverlay = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Overlay
    ref={ref}
    className={cn("fixed inset-0 bg-black/40 z-40", className)}
    {...props}
  />
))
DrawerOverlay.displayName = DrawerPrimitive.Overlay.displayName

const DrawerContent = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DrawerPortal>
    <DrawerOverlay />
    <DrawerPrimitive.Content
      ref={ref}
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl bg-white p-6 shadow-lg",
        "animate-in slide-in-from-bottom-80",
        className
      )}
      {...props}
    >
      {children}
    </DrawerPrimitive.Content>
  </DrawerPortal>
))
DrawerContent.displayName = DrawerPrimitive.Content.displayName

const DrawerHeader = ({ children, className }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("mb-4 text-center", className)}>{children}</div>
)

const DrawerTitle = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Title
    ref={ref}
    className={cn("text-lg font-medium", className)}
    {...props}
  />
))
DrawerTitle.displayName = DrawerPrimitive.Title.displayName

const DrawerFooter = ({ children, className }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("mt-4 flex justify-end gap-2", className)}>{children}</div>
)

export {
  Drawer,
  DrawerTrigger,
  DrawerContent,
  DrawerClose,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
}
