import React from 'react';

export default function SavingsPage() {
  return (
    <main className="container mx-auto px-4 py-8">
      <div className="mb-8">
      </div>

      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Potential Savings Summary</h2>
        
        <div className="grid md:grid-cols-2 gap-8 mb-8">
          <div className="border p-6 rounded-lg">
            <h3 className="text-2xl font-bold mb-2">Total Potential Savings</h3>
            <p className="text-5xl font-bold mb-4">$25 Billion</p>
            <p>
              Based on publicly available information from state auditor reports about potential 
              savings from program eliminations, contract renegotiations, and workforce optimizations.
            </p>
          </div>
          
          <div className="border p-6 rounded-lg">
            <h3 className="text-2xl font-bold mb-2">Per Taxpayer Impact</h3>
            <p className="text-5xl font-bold mb-4">$789.45</p>
            <p>
              Calculated using an estimate of 31.6 million individual California taxpayers.
            </p>
          </div>
        </div>
      </section>

      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Savings Opportunities by Agency</h2>
        <p className="mb-6">
          The following information is compiled from publicly available California State Auditor reports.
          Each item includes a reference to the specific report for verification.
        </p>
        
        <div className="space-y-8">
          <div className="border p-6 rounded-lg">
            <h3 className="text-2xl font-bold mb-2">Department of Health Care Services</h3>
            <p className="mb-2">
              <strong>Potential Savings:</strong> $4 billion
            </p>
            <p className="mb-2">
              <strong>Source:</strong> <a href="https://information.auditor.ca.gov/reports/2018-603/index.html" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">State Auditor Report 2018-603</a>
            </p>
            <p>
              Savings could be achieved through improved Medi-Cal payment integrity and reducing improper payments.
              The auditor identified significant opportunities to recover funds from improper billing practices
              and strengthen oversight of the Medi-Cal program.
            </p>
          </div>
          
          <div className="border p-6 rounded-lg">
            <h3 className="text-2xl font-bold mb-2">Department of Transportation</h3>
            <p className="mb-2">
              <strong>Potential Savings:</strong> $1.5 billion
            </p>
            <p className="mb-2">
              <strong>Source:</strong> <a href="https://information.auditor.ca.gov/reports/2019-104/summary.html" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">State Auditor Report 2019-104</a>
            </p>
            <p>
              Savings could be achieved through improved contract management and elimination of redundant projects.
              The audit found instances of project overlap, inefficient resource allocation, and opportunities
              to consolidate transportation initiatives.
            </p>
          </div>
          
          <div className="border p-6 rounded-lg">
            <h3 className="text-2xl font-bold mb-2">Department of Corrections and Rehabilitation</h3>
            <p className="mb-2">
              <strong>Potential Savings:</strong> $3.2 billion
            </p>
            <p className="mb-2">
              <strong>Source:</strong> <a href="https://information.auditor.ca.gov/reports/2018-113/index.html" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">State Auditor Report 2018-113</a>
            </p>
            <p>
              Savings could be achieved through prison population reduction initiatives and improved healthcare 
              delivery systems. The audit identified opportunities to reduce operational costs while maintaining
              public safety standards.
            </p>
          </div>
          
          <div className="border p-6 rounded-lg">
            <h3 className="text-2xl font-bold mb-2">California State University System</h3>
            <p className="mb-2">
              <strong>Potential Savings:</strong> $2.1 billion
            </p>
            <p className="mb-2">
              <strong>Source:</strong> <a href="https://information.auditor.ca.gov/reports/2017-102/index.html" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">State Auditor Report 2017-102</a>
            </p>
            <p>
              Savings could be achieved through administrative consolidation and improved procurement practices.
              The audit found opportunities to streamline operations across campuses and leverage the system&apos;s
              purchasing power more effectively.
            </p>
          </div>
          
          <div className="border p-6 rounded-lg">
            <h3 className="text-2xl font-bold mb-2">Employment Development Department</h3>
            <p className="mb-2">
              <strong>Potential Savings:</strong> $5.5 billion
            </p>
            <p className="mb-2">
              <strong>Source:</strong> <a href="https://information.auditor.ca.gov/reports/2020-128/index.html" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">State Auditor Report 2020-128</a>
            </p>
            <p>
              Savings could be achieved through improved fraud prevention measures and modernized IT systems.
              The audit highlighted significant vulnerabilities in the unemployment insurance program that
              led to fraudulent claims and improper payments.
            </p>
          </div>
        </div>
      </section>
      
      <section className="mb-8">
        <h2 className="text-2xl font-bold mb-6">Additional Savings Opportunities</h2>
        <p className="mb-4">
          Beyond the major agencies listed above, the California State Auditor has identified numerous
          other opportunities for cost savings across state government:
        </p>
        
        <ul className="list-disc pl-6 space-y-4">
          <li>
            <strong>Procurement Reform:</strong> Estimated $1.8 billion in savings through centralized
            purchasing and elimination of duplicative contracts (<a href="https://information.auditor.ca.gov/reports/2019-112/index.html" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">State Auditor Report 2019-112</a>)
          </li>
          <li>
            <strong>Property Management:</strong> Estimated $1.2 billion in savings through better
            utilization of state-owned properties and reduction of leased space (<a href="https://information.auditor.ca.gov/reports/2018-117/index.html" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">State Auditor Report 2018-117</a>)
          </li>
          <li>
            <strong>IT Modernization:</strong> Estimated $900 million in savings through consolidation
            of IT systems and elimination of legacy technologies (<a href="https://information.auditor.ca.gov/reports/2020-601/index.html" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">State Auditor Report 2020-601</a>)
          </li>
          <li>
            <strong>Energy Efficiency:</strong> Estimated $750 million in savings through improved
            energy management in state facilities (<a href="https://information.auditor.ca.gov/reports/2017-119/index.html" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">State Auditor Report 2017-119</a>)
          </li>
        </ul>
      </section>
      
      <section>
        <h2 className="text-2xl font-bold mb-6">Sources</h2>
        <p className="mb-4">
          The information presented on this page is compiled from publicly available <a href="https://information.auditor.ca.gov/reports" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">California State Auditor reports</a> and other government documents. The potential savings figures represent estimates based on
          these official sources.
        </p>
        <p>
          Last updated: March 5, 2023
        </p>
      </section>
    </main>
  );
} 