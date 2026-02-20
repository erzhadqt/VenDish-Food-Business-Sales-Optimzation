import { CheckCircle2Icon } from "lucide-react"
import { Alert, AlertTitle } from "../Components/ui/alert"

export default function SuccessAlert({ message = "Success! Your changes have been saved." }) {
  return (
    <Alert className="bg-gray-800 text-zinc-200 border-none flex items-center">
      <CheckCircle2Icon className="h-5 w-5 mr-3 text-green-400" />
      <AlertTitle className="mb-0 text-sm font-medium">{message}</AlertTitle>
    </Alert>
  )
}