'use client'

import { Button } from "@/components/ui/button"
import { ChevronLeft } from "lucide-react"
import { useRouter } from "next/navigation"

export default function BackButton() {
  const router = useRouter()

  return (
    <Button
      variant="ghost"
      onClick={() => router.back()}
      className="mb-6 hover:bg-transparent"
    >
      <ChevronLeft className="h-4 w-4 mr-2" />
      Back
    </Button>
  )
} 