import Button from '@/components/Button';

export default function AboutPage() {
  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-8">California Version of DOGE.gov About Coming Soon</h1>
      <Button 
        href="https://www.whitehouse.gov/presidential-actions/2025/01/establishing-and-implementing-the-presidents-department-of-government-efficiency/"
        variant="primary"
      >
        DOGE.gov about
      </Button>
    </main>
  );
} 