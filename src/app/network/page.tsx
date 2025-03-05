'use client';
import { FaExternalLinkAlt, FaTwitter } from 'react-icons/fa';
import Image from 'next/image';

export default function NetworkPage() {
  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-8">DOGE State Network</h1>
      
      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4">Overview</h2>
        <p className="mb-4 leading-relaxed">
          The emergence of state-level DOGE-inspired initiatives represents a significant trend in government reform efforts. These initiatives share common goals of increasing efficiency and reducing waste, though their approaches, structures, and progress vary substantially. While there is no evidence of a formal communication network connecting these various state efforts, the parallel development of similar programs across multiple states suggests a broader movement toward government efficiency reform inspired by the federal DOGE model.
        </p>
        <p className="leading-relaxed">
          The success of these initiatives remains to be seen, as most are in relatively early stages of implementation. Future research might focus on developing metrics to evaluate the effectiveness of these programs, as well as exploring opportunities for cross-state collaboration and knowledge sharing that could enhance their collective impact.
        </p>
      </section>
      
      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4">State Initiatives</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-300 rounded-lg">
            <thead className="bg-gray-100">
              <tr>
                <th className="py-3 px-4 text-left font-semibold border-b">State</th>
                <th className="py-3 px-4 text-left font-semibold border-b">Initiative Name</th>
                <th className="py-3 px-4 text-left font-semibold border-b">Leadership</th>
                <th className="py-3 px-4 text-left font-semibold border-b">Structure</th>
                <th className="py-3 px-4 text-left font-semibold border-b">Focus Areas</th>
                <th className="py-3 px-4 text-left font-semibold border-b">Work Completed/Planned</th>
                <th className="py-3 px-4 text-left font-semibold border-b">Contact Information</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b hover:bg-gray-50 bg-blue-50">
                <td className="py-3 px-4">California</td>
                <td className="py-3 px-4">California DOGE</td>
                <td className="py-3 px-4">Volunteer</td>
                <td className="py-3 px-4">Volunteer-led initiative</td>
                <td className="py-3 px-4">Highlighting waste, fraud, and abuse; transparency of state government organizations</td>
                <td className="py-3 px-4">
                  <div className="flex flex-col space-y-2">
                    <span>Created and operate X accounts and maintain a site mirroring the federal DOGE site</span>
                    <a 
                      href="https://cali-doge.org" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center text-blue-600 hover:text-blue-800 transition-colors"
                    >
                      <Image 
                        src="https://cali-doge.org/favicon.ico" 
                        alt="Cali-DOGE favicon" 
                        className="mr-2" 
                        width={16} 
                        height={16} 
                        unoptimized
                      />
                      <span>cali-doge.org</span>
                    </a>
                    <a 
                      href="https://doge.gov" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center text-blue-600 hover:text-blue-800 transition-colors"
                    >
                      <Image 
                        src="https://doge.gov/favicon.ico" 
                        alt="Federal DOGE favicon" 
                        className="mr-2" 
                        width={16} 
                        height={16} 
                        unoptimized
                      />
                      <span>Federal DOGE (doge.gov)</span>
                    </a>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <div className="flex flex-col space-y-2">
                    <a 
                      href="https://twitter.com/Cali_DOGE" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center text-blue-600 hover:text-blue-800 transition-colors"
                    >
                      <FaTwitter className="mr-2 text-sm" />
                      <span>@Cali_DOGE</span>
                    </a>
                    <a 
                      href="https://twitter.com/CA__DOGE" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center text-blue-600 hover:text-blue-800 transition-colors"
                    >
                      <FaTwitter className="mr-2 text-sm" />
                      <span>@CA__DOGE</span>
                    </a>
                  </div>
                </td>
              </tr>
              <tr className="border-b hover:bg-gray-50">
                <td className="py-3 px-4">Florida</td>
                <td className="py-3 px-4">State DOGE Task Force</td>
                <td className="py-3 px-4">Governor Ron DeSantis</td>
                <td className="py-3 px-4">Executive task force</td>
                <td className="py-3 px-4">Bureaucratic reduction, modernization</td>
                <td className="py-3 px-4">Evaluating 70 state boards/commissions; examining local government spending; auditing state universities; implementing AI solutions</td>
                <td className="py-3 px-4">Not publicly available</td>
              </tr>
              <tr className="border-b hover:bg-gray-50">
                <td className="py-3 px-4">Georgia</td>
                <td className="py-3 px-4">Red Tape Rollback Act of 2025</td>
                <td className="py-3 px-4">State Legislature</td>
                <td className="py-3 px-4">Legislative initiative</td>
                <td className="py-3 px-4">Regulatory reform</td>
                <td className="py-3 px-4">Requires state agencies to review regulations every four years</td>
                <td className="py-3 px-4">Georgia State Capitol: (404) 656-2000</td>
              </tr>
              <tr className="border-b hover:bg-gray-50">
                <td className="py-3 px-4">Iowa</td>
                <td className="py-3 px-4">State DOGE Task Force</td>
                <td className="py-3 px-4">Governor Kim Reynolds; Led by Emily Schmitt (Sukup Manufacturing)</td>
                <td className="py-3 px-4">Executive order initiative</td>
                <td className="py-3 px-4">Building on existing efficiency efforts</td>
                <td className="py-3 px-4">Building on past initiatives that reportedly saved $217 million; recommendations on taxpayer investment and technology</td>
                <td className="py-3 px-4">Office of the Governor: (515) 281-5211</td>
              </tr>
              <tr className="border-b hover:bg-gray-50">
                <td className="py-3 px-4">Kansas</td>
                <td className="py-3 px-4">Committee on Government Efficiency</td>
                <td className="py-3 px-4">State Legislature</td>
                <td className="py-3 px-4">Legislative committee</td>
                <td className="py-3 px-4">Government waste reduction</td>
                <td className="py-3 px-4">Established portal for residents to suggest improvements</td>
                <td className="py-3 px-4">Kansas State Capitol: (785) 296-0111</td>
              </tr>
              <tr className="border-b hover:bg-gray-50">
                <td className="py-3 px-4">Kentucky</td>
                <td className="py-3 px-4">Government Efficiency Initiative</td>
                <td className="py-3 px-4">State government</td>
                <td className="py-3 px-4">Not specified in sources</td>
                <td className="py-3 px-4">Government waste reduction</td>
                <td className="py-3 px-4">Initiative in early stages</td>
                <td className="py-3 px-4">Not publicly available</td>
              </tr>
              <tr className="border-b hover:bg-gray-50">
                <td className="py-3 px-4">Mississippi</td>
                <td className="py-3 px-4">Health and Welfare Efficiency Task Force</td>
                <td className="py-3 px-4">State Senate</td>
                <td className="py-3 px-4">Senate-approved task force</td>
                <td className="py-3 px-4">Health and welfare systems</td>
                <td className="py-3 px-4">Bill passed to establish task force; implementation details pending</td>
                <td className="py-3 px-4">Mississippi Legislature: (601) 359-3770</td>
              </tr>
              <tr className="border-b hover:bg-gray-50">
                <td className="py-3 px-4">Missouri</td>
                <td className="py-3 px-4">Senate Government Efficiency Committee</td>
                <td className="py-3 px-4">State Senate</td>
                <td className="py-3 px-4">Senate committee</td>
                <td className="py-3 px-4">Government waste reduction</td>
                <td className="py-3 px-4">Launched online portal for citizens to report government waste</td>
                <td className="py-3 px-4">Missouri Senate: (573) 751-3824</td>
              </tr>
              <tr className="border-b hover:bg-gray-50">
                <td className="py-3 px-4">New Hampshire</td>
                <td className="py-3 px-4">Commission on Government Efficiency (COGE)</td>
                <td className="py-3 px-4">Governor Kelly Ayotte; Co-chairs: former Governor Craig Benson and businessman Andy Crews</td>
                <td className="py-3 px-4">15-member commission (13 governor-appointed, 2 legislative)</td>
                <td className="py-3 px-4">Streamlining government, cutting inefficient spending</td>
                <td className="py-3 px-4">Developing proposals for government streamlining</td>
                <td className="py-3 px-4">Office of the Governor: (603) 271-2121</td>
              </tr>
              <tr className="border-b hover:bg-gray-50">
                <td className="py-3 px-4">Oklahoma</td>
                <td className="py-3 px-4">DOGE-OK</td>
                <td className="py-3 px-4">Governor Kevin Stitt</td>
                <td className="py-3 px-4">Division under Office of Management and Enterprise Services</td>
                <td className="py-3 px-4">Flat budgets, limiting government growth</td>
                <td className="py-3 px-4">Report due March 31, 2025; operational until July 4, 2026</td>
                <td className="py-3 px-4">OMES: (405) 521-2141</td>
              </tr>
              <tr className="border-b hover:bg-gray-50">
                <td className="py-3 px-4">Pennsylvania</td>
                <td className="py-3 px-4">Proposed: PA Delegation on Government Efficiency and PA Department of Government Efficiency</td>
                <td className="py-3 px-4">State Legislature</td>
                <td className="py-3 px-4">Proposed legislation</td>
                <td className="py-3 px-4">Government efficiency</td>
                <td className="py-3 px-4">Legislation proposed, not yet enacted</td>
                <td className="py-3 px-4">Pennsylvania Legislature: (717) 787-2372</td>
              </tr>
              <tr className="hover:bg-gray-50">
                <td className="py-3 px-4">Texas</td>
                <td className="py-3 px-4">Proposed Texas DOGE</td>
                <td className="py-3 px-4">Lieutenant Governor Dan Patrick</td>
                <td className="py-3 px-4">Priority legislation</td>
                <td className="py-3 px-4">Government efficiency</td>
                <td className="py-3 px-4">&ldquo;Deliver Government Efficiency&rdquo; committee formed; legislation identified as priority</td>
                <td className="py-3 px-4">Lieutenant Governor&apos;s Office: (512) 463-0001</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
      
      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4">Sources</h2>
        <ul className="space-y-2">
          <li>
            <a 
              href="https://www.washingtonexaminer.com/policy/finance-and-economy/3310134/oklahoma-latest-state-launch-doge-effort/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center text-blue-600 hover:text-blue-800 transition-colors"
            >
              <span>Washington Examiner: Oklahoma latest state to launch DOGE effort</span>
              <FaExternalLinkAlt className="ml-2 text-sm" />
            </a>
          </li>
          <li>
            <a 
              href="https://www.govtech.com/policy/multiple-states-move-on-government-efficiency-initiatives"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center text-blue-600 hover:text-blue-800 transition-colors"
            >
              <span>GovTech: Multiple States Move on Government Efficiency Initiatives</span>
              <FaExternalLinkAlt className="ml-2 text-sm" />
            </a>
          </li>
          <li>
            <a 
              href="https://www.civitasinstitute.org/research/every-state-needs-a-doge"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center text-blue-600 hover:text-blue-800 transition-colors"
            >
              <span>Civitas Institute: Every State Needs a DOGE</span>
              <FaExternalLinkAlt className="ml-2 text-sm" />
            </a>
          </li>
        </ul>
        <p>
          Last updated: March 6, 2025
        </p>
      </section>
    </main>
  );
} 