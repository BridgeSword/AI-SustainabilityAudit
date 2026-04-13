import Navigation from "@/components/layout/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SectorRanking() {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Sector Ranking</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Sector Ranking page is temporarily disabled while the page code is being repaired.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}