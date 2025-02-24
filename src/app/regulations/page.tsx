import Button from '@/components/Button';

export default function RegulationsPage() {
  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-8">California Version of DOGE.gov Regulations Coming Soon</h1>
      <Button 
        href="https://doge.gov/regulations"
        variant="primary"
      >
        DOGE.gov regulations
      </Button>
    </main>
  );
} 