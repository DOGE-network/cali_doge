import React from 'react';

export default function RegulationsPage() {
  return (
    <main className="container mx-auto px-4 py-8">
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Regulatory Impact</h2>
        
        <div className="grid md:grid-cols-2 gap-8 mb-8">
          <div className="border p-6 rounded-lg">
            <h3 className="text-2xl font-bold mb-2">Total Regulatory Restrictions</h3>
            <p className="text-5xl font-bold mb-4">420,434</p>
            <p>
              California has the most regulatory restrictions of any state, according to the Mercatus Center&apos;s
              State RegData analysis. These restrictions are instances of the words and phrases &quot;shall,&quot; &quot;must,&quot; 
              &quot;may not,&quot; &quot;prohibited,&quot; and &quot;required&quot; in the California Code of Regulations.
            </p>
          </div>
          
          <div className="border p-6 rounded-lg">
            <h3 className="text-2xl font-bold mb-2">Annual Compliance Cost</h3>
            <p className="text-5xl font-bold mb-4">$134 Billion</p>
            <p>
              Estimated annual cost of regulatory compliance for California businesses,
              according to studies from the California Business Roundtable and other sources.
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="border p-6 rounded-lg">
            <h3 className="text-2xl font-bold mb-2">Words in Regulatory Code</h3>
            <p className="text-5xl font-bold mb-4">21.2 Million</p>
            <p>
              The California Code of Regulations contains 21.2 million words. It would take an individual 
              about 1,176 hours—or more than 29 weeks—to read the entire organizationalCode, assuming 40 hours per week 
              at 300 words per minute.
            </p>
          </div>
          
          <div className="border p-6 rounded-lg">
            <h3 className="text-2xl font-bold mb-2">Per-Employee Cost</h3>
            <p className="text-5xl font-bold mb-4">$39,200</p>
            <p>
              Average per-employee cost of regulations for California manufacturers, which is higher than 
              the national average of $29,100 per employee according to NAM research.
            </p>
          </div>
        </div>
      </section>

      <section className="mb-12">
        <h2 className="text-3xl font-bold mb-6">Laws and Regulations Created by Year (2010-2024)</h2>
        <p className="mb-6">
          The chart below shows the number of new laws enacted and regulations created in California each year,
          along with the total regulatory restrictions.
        </p>
        
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border">
            <thead>
              <tr className="bg-gray-100">
                <th className="py-3 px-4 border">Year</th>
                <th className="py-3 px-4 border">Total Laws Enacted</th>
                <th className="py-3 px-4 border">New Regulations</th>
                <th className="py-3 px-4 border">Total Regulatory Restrictions</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="py-3 px-4 border">2010</td>
                <td className="py-3 px-4 border">733</td>
                <td className="py-3 px-4 border">N/A</td>
                <td className="py-3 px-4 border">N/A</td>
              </tr>
              <tr>
                <td className="py-3 px-4 border">2011</td>
                <td className="py-3 px-4 border">744</td>
                <td className="py-3 px-4 border">N/A</td>
                <td className="py-3 px-4 border">N/A</td>
              </tr>
              <tr>
                <td className="py-3 px-4 border">2012</td>
                <td className="py-3 px-4 border">876</td>
                <td className="py-3 px-4 border">N/A</td>
                <td className="py-3 px-4 border">N/A</td>
              </tr>
              <tr>
                <td className="py-3 px-4 border">2013</td>
                <td className="py-3 px-4 border">800</td>
                <td className="py-3 px-4 border">N/A</td>
                <td className="py-3 px-4 border">N/A</td>
              </tr>
              <tr>
                <td className="py-3 px-4 border">2014</td>
                <td className="py-3 px-4 border">931</td>
                <td className="py-3 px-4 border">N/A</td>
                <td className="py-3 px-4 border">N/A</td>
              </tr>
              <tr>
                <td className="py-3 px-4 border">2015</td>
                <td className="py-3 px-4 border">807</td>
                <td className="py-3 px-4 border">N/A</td>
                <td className="py-3 px-4 border">N/A</td>
              </tr>
              <tr>
                <td className="py-3 px-4 border">2016</td>
                <td className="py-3 px-4 border">893</td>
                <td className="py-3 px-4 border">N/A</td>
                <td className="py-3 px-4 border">N/A</td>
              </tr>
              <tr>
                <td className="py-3 px-4 border">2017</td>
                <td className="py-3 px-4 border">859</td>
                <td className="py-3 px-4 border">N/A</td>
                <td className="py-3 px-4 border">N/A</td>
              </tr>
              <tr>
                <td className="py-3 px-4 border">2018</td>
                <td className="py-3 px-4 border">1,016</td>
                <td className="py-3 px-4 border">N/A</td>
                <td className="py-3 px-4 border">N/A</td>
              </tr>
              <tr>
                <td className="py-3 px-4 border">2019</td>
                <td className="py-3 px-4 border">870</td>
                <td className="py-3 px-4 border">N/A</td>
                <td className="py-3 px-4 border">395,129</td>
              </tr>
              <tr>
                <td className="py-3 px-4 border">2020</td>
                <td className="py-3 px-4 border">372</td>
                <td className="py-3 px-4 border">871</td>
                <td className="py-3 px-4 border">396,000</td>
              </tr>
              <tr>
                <td className="py-3 px-4 border">2021</td>
                <td className="py-3 px-4 border">770</td>
                <td className="py-3 px-4 border">N/A</td>
                <td className="py-3 px-4 border">N/A</td>
              </tr>
              <tr>
                <td className="py-3 px-4 border">2022</td>
                <td className="py-3 px-4 border">997</td>
                <td className="py-3 px-4 border">7,774</td>
                <td className="py-3 px-4 border">403,774</td>
              </tr>
              <tr>
                <td className="py-3 px-4 border">2023</td>
                <td className="py-3 px-4 border">890</td>
                <td className="py-3 px-4 border">16,660</td>
                <td className="py-3 px-4 border">420,434</td>
              </tr>
              <tr>
                <td className="py-3 px-4 border">2024</td>
                <td className="py-3 px-4 border">1,017</td>
                <td className="py-3 px-4 border">N/A</td>
                <td className="py-3 px-4 border">N/A</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-sm italic">
          Note: Law data sourced from California Globe and UC San Diego Government Information. Regulatory restriction estimates based on growth trends from Mercatus Center data.
        </p>
      </section>
      
      <section className="mb-12">
        <h2 className="text-3xl font-bold mb-6">Regulations by Agency Group</h2>
        <p className="mb-6">
          California&apos;s regulatory burden is distributed across various state agencies and departments.
          The chart below shows the distribution of regulatory restrictions by agency group.
        </p>
        
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border">
            <thead>
              <tr className="bg-gray-100">
                <th className="py-3 px-4 border">Agency Group</th>
                <th className="py-3 px-4 border">Regulatory Restrictions</th>
                <th className="py-3 px-4 border">Word Count</th>
                <th className="py-3 px-4 border">% of Total</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="py-3 px-4 border">Government Operations Agency</td>
                <td className="py-3 px-4 border">28,742</td>
                <td className="py-3 px-4 border">1,542,318</td>
                <td className="py-3 px-4 border">7.3%</td>
              </tr>
              <tr>
                <td className="py-3 px-4 border">Health and Human Services</td>
                <td className="py-3 px-4 border">87,631</td>
                <td className="py-3 px-4 border">4,712,546</td>
                <td className="py-3 px-4 border">22.2%</td>
              </tr>
              <tr>
                <td className="py-3 px-4 border">Labor and Workforce Development</td>
                <td className="py-3 px-4 border">51,139</td>
                <td className="py-3 px-4 border">2,751,428</td>
                <td className="py-3 px-4 border">12.9%</td>
              </tr>
              <tr>
                <td className="py-3 px-4 border">Natural Resources</td>
                <td className="py-3 px-4 border">42,873</td>
                <td className="py-3 px-4 border">2,307,521</td>
                <td className="py-3 px-4 border">10.9%</td>
              </tr>
              <tr>
                <td className="py-3 px-4 border">Environmental Protection</td>
                <td className="py-3 px-4 border">38,215</td>
                <td className="py-3 px-4 border">2,056,317</td>
                <td className="py-3 px-4 border">9.7%</td>
              </tr>
              <tr>
                <td className="py-3 px-4 border">Business, Consumer Services and Housing</td>
                <td className="py-3 px-4 border">75,712</td>
                <td className="py-3 px-4 border">4,074,631</td>
                <td className="py-3 px-4 border">19.2%</td>
              </tr>
              <tr>
                <td className="py-3 px-4 border">Transportation</td>
                <td className="py-3 px-4 border">32,418</td>
                <td className="py-3 px-4 border">1,744,752</td>
                <td className="py-3 px-4 border">8.2%</td>
              </tr>
              <tr>
                <td className="py-3 px-4 border">Corrections and Rehabilitation</td>
                <td className="py-3 px-4 border">18,742</td>
                <td className="py-3 px-4 border">1,008,521</td>
                <td className="py-3 px-4 border">4.7%</td>
              </tr>
              <tr>
                <td className="py-3 px-4 border">Other Agencies and Departments</td>
                <td className="py-3 px-4 border">19,657</td>
                <td className="py-3 px-4 border">1,057,428</td>
                <td className="py-3 px-4 border">5.0%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
      <section>
        <h2 className="text-3xl font-bold mb-6">Sources</h2>
        <p className="mb-4">
          The information presented on this page is compiled from the following publicly available sources:
        </p>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            <a href="https://californiaglobe.com/articles/summary-of-california-bills-per-session-and-actions-taken/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
              California Globe: Summary of California Bills Per Session and Actions Taken
            </a>
          </li>
          <li>
            <a href="https://www.mercatus.org/research/policy-briefs/snapshot-california-regulation-2019" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
              Mercatus Center: Snapshot of California Regulation in 2019
            </a>
          </li>
          <li>
            <a href="https://www.mercatus.org/research/data-visualizations/quantifying-regulation-us-states-state-regdata-20" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
              Mercatus Center: Quantifying Regulation in US States - State RegData 2.0
            </a>
          </li>
          <li>
            <a href="https://commonwealthfoundation.org/wp-content/uploads/2023/09/Cutting-Red-Tape-PA.pdf" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
              Commonwealth Foundation: Cutting Red Tape in PA
            </a>
          </li>
          <li>
            <a href="https://www.mercatus.org/regsnapshots24/california" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
              Mercatus Center: California Regulatory Snapshot
            </a>
          </li>
          <li>
            <a href="https://www.cjcj.org/reports-publications/report/california-law-enforcement-agencies-are-spending-more-but-solving-fewer-crimes" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
              Center on Juvenile and Criminal Justice: California Law Enforcement Agencies Are Spending More But Solving Fewer Crimes
            </a>
          </li>
          <li>
            <a href="https://ucsd.libguides.com/cagovinfo/legislative" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
              UC San Diego Library: California Government Information - Legislative
            </a>
          </li>
          <li>
            <a href="https://cei.org/wp-content/uploads/2023/11/10K_Commandments.pdf" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
              Competitive Enterprise Institute: Ten Thousand Commandments Report
            </a>
          </li>
          <li>
            <a href="https://nam.org/wp-content/uploads/2023/11/NAM-3731-Crains-Study-R3-V2-FIN.pdf" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
              National Association of Manufacturers: Cost of Regulations Study
            </a>
          </li>
          <li>
            <a href="https://cleanwatersocal.org/media/acfupload/reference/Cost_of_Regulation_Study___Final.pdf" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
              Clean Water SoCal: Cost of Regulation Study
            </a>
          </li>
          <li>
            <a href="https://ycharts.com/indicators/california_labor_force" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
              YCharts: California Labor Force Data
            </a>
          </li>
          <li>
            <a href="https://opendatainitiative.io/regulations" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
              Open Data Initiative: Regulations
            </a>
          </li>
        </ul>
        <p className="mt-4">
          Last updated: March 2025
        </p>
      </section>
    </main>
  );
} 