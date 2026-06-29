import { Card, CardContent } from '../components/ui/card'

// Placeholder for the ideal workout outlines (with exercise alternatives).
// The real outlines will be filled in later.
export default function Outlines() {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-medium">Workout Outlines</h2>
      <Card className="bg-gray-900 border-gray-800">
        <CardContent className="py-16 flex flex-col items-center text-center gap-3">
          <span className="text-4xl">🚧</span>
          <p className="text-gray-300 font-medium">Under construction</p>
          <p className="text-sm text-gray-500 max-w-md">
            Ideal workout outlines with exercise alternatives are coming here. You'll be
            able to lay out template workouts and swap-in options for each movement.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
