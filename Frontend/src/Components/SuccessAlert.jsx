import { CheckCircle2Icon } from "lucide-react"
import { Alert, AlertTitle } from "../Components/ui/alert"

export default function SuccessAlert() {
  return (
    <Alert className="bg-gray-800 text-zinc-200">
      <CheckCircle2Icon className="mr-2" />
      <AlertTitle>Success! Your changes have been saved.</AlertTitle>
    </Alert>
  )
}
