import { FaGithub, FaLinkedin } from 'react-icons/fa';
import josh from '../../assets/profile_pic/josh.jpg';
import dennis from '../../assets/profile_pic/dennis.jpg';
import yawe from '../../assets/profile_pic/yawe.jpg';
import inaki from '../../assets/profile_pic/inaki.jpg';
import earl from '../../assets/profile_pic/earl.jpg';
import { MdOutlineWeb } from 'react-icons/md';

const About = () => {
  const team = [
    {
      name: 'Josh Khovick Fermano',
      role: 'Founder | Lead Developer',
      description:
        'Full-stack developer with expertise in TypeScript, React, Node, Express, SQL and NoSQL Databases.',
      isFounder: true,
      imageUrl: { josh },
      github: 'https://github.com/joshfermano',
      linkedin: 'https://www.linkedin.com/in/joshfermano/',
      website: 'https://www.joshfermano.me/',
    },
    {
      name: 'Earl Justine Simbajon',
      role: 'UI/UX Designer',
      description: 'Creating intuitive and accessible user experiences',
      isFounder: false,
      imageUrl: { earl },
      github: 'https://github.com/eaearly',
      linkedin: 'https://linkedin.com/in/',
      website: 'https://example.com/',
    },
    {
      name: 'Inaki Manuel Flores',
      role: 'Systems Analyst',
      description: 'Ensuring smooth operations and timely deliveries',
      isFounder: false,
      imageUrl: { inaki },
      github: 'https://github.com/',
      linkedin: 'https://linkedin.com/in/',
      website: 'https://example.com/',
    },
    {
      name: 'Dennis Delos Santos',
      role: 'Web Developer',
      description: 'Ensuring smooth operations and timely deliveries',
      isFounder: false,
      imageUrl: { dennis },
      github: 'https://github.com/',
      linkedin: 'https://linkedin.com/in/',
      website: 'https://example.com/',
    },
    {
      name: 'Yahweh Sarceno',
      role: 'Web Developer',
      description: 'Ensuring smooth operations and timely deliveries',
      isFounder: false,
      imageUrl: { yawe },
      github: 'https://github.com/',
      linkedin: 'https://linkedin.com/in/',
      website: 'https://example.com/',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-light via-blue-50/30 to-slate-100/50 dark:bg-gradient-to-br dark:from-darkBlue dark:via-slate-900/90 dark:to-gray-900/80 text-darkBlue dark:text-light transition-all duration-300 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-cyan-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-tr from-cyan-400/15 to-blue-500/15 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 right-1/4 w-64 h-64 bg-gradient-to-r from-blue-400/10 to-teal-400/10 rounded-full blur-2xl animate-pulse delay-500"></div>
      </div>

      <div className="relative z-10 px-4 py-8 md:py-16">
        <div className="max-w-5xl mx-auto space-y-16">
          {/* Hero Section */}
          <div className="space-y-8 text-center">
            <div className="space-y-4">
              <h1 className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-blue-600 via-blue-600 to-cyan-600 dark:from-blue-400 dark:via-blue-400 dark:to-cyan-400 bg-clip-text text-transparent leading-tight">
                About OpenSpace
              </h1>
              <div className="w-24 h-1 bg-gradient-to-r from-blue-500 to-cyan-500 mx-auto rounded-full"></div>
            </div>
            <p className="text-xl md:text-2xl max-w-4xl mx-auto text-gray-600 dark:text-gray-300 leading-relaxed font-light">
              A modern platform for finding and booking collaborative workspaces
              that inspire creativity and productivity.
            </p>
          </div>

          {/* Mission Section */}
          <div className="max-w-2xl mx-auto">
            <div className="bg-white/40 dark:bg-gray-800/20 backdrop-blur-md border border-white/30 dark:border-gray-700/20 rounded-xl p-6 shadow-sm">
              <div className="text-center space-y-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Our Mission
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                  Connecting professionals with inspiring workspaces where they
                  can thrive. We make it easy to discover, compare, and book
                  workspaces, creating a more flexible and productive work
                  culture for everyone.
                </p>
              </div>
            </div>
          </div>

          {/* Features Section */}
          <div className="space-y-8">
            <h2 className="text-xl font-semibold text-center text-gray-900 dark:text-white">
              What We Offer
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                {
                  title: 'Curated Workspaces',
                  description: 'Hand-picked spaces for productivity',
                  icon: '🏢',
                },
                {
                  title: 'Seamless Booking',
                  description: 'Easy reservations with instant confirmation',
                  icon: '⚡',
                },
                {
                  title: 'Verified Reviews',
                  description: 'Authentic feedback from real users',
                  icon: '⭐',
                },
              ].map((feature, index) => (
                <div
                  key={index}
                  className="p-4 bg-white/40 dark:bg-gray-800/20 backdrop-blur-md border border-white/30 dark:border-gray-700/20 rounded-lg shadow-sm hover:bg-white/50 dark:hover:bg-gray-800/30 transition-all duration-200 text-center">
                  <div className="text-2xl mb-2">{feature.icon}</div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Team Section */}
          <div className="space-y-12">
            <h2 className="text-3xl md:text-4xl font-bold text-center bg-gradient-to-r from-blue-600 to-cyan-600 dark:from-blue-400 dark:to-cyan-400 bg-clip-text text-transparent">
              Our Team
            </h2>

            {/* Founder Section */}
            {team
              .filter((member) => member.isFounder)
              .map((founder, index) => (
                <div
                  key={`founder-${index}`}
                  className="bg-white/60 dark:bg-gray-800/40 backdrop-blur-lg border border-white/30 dark:border-gray-700/20 rounded-2xl shadow-lg shadow-blue-500/5 dark:shadow-blue-500/5 overflow-hidden transition-all duration-300 hover:shadow-xl hover:bg-white/70 dark:hover:bg-gray-800/50">
                  <div className="flex flex-col lg:flex-row">
                    <div className="lg:w-2/5 h-64 sm:h-80 lg:h-auto relative overflow-hidden">
                      <img
                        src={founder.imageUrl.josh}
                        alt={founder.name}
                        className="w-full h-full object-cover object-center transition-transform duration-500 hover:scale-105"
                      />
                    </div>

                    <div className="lg:w-3/5 p-6 sm:p-8 lg:p-10 flex flex-col justify-center">
                      <div>
                        <h3 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white mb-2">
                          {founder.name}
                        </h3>
                        <p className="text-base text-blue-600 dark:text-blue-400 font-medium mb-4">
                          {founder.role}
                        </p>
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
                          {founder.description}
                        </p>
                      </div>

                      <div className="flex space-x-4">
                        <a
                          href={founder.github}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200">
                          <FaGithub size={20} />
                        </a>
                        <a
                          href={founder.linkedin}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200">
                          <FaLinkedin size={20} />
                        </a>
                        <a
                          href={founder.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200">
                          <MdOutlineWeb size={20} />
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

            {/* Team Members Section */}
            <div className="space-y-8">
              <h3 className="text-xl md:text-2xl font-medium text-center text-gray-700 dark:text-gray-300">
                Team Members
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                {team
                  .filter((member) => !member.isFounder)
                  .map((member, index) => (
                    <div
                      key={`member-${index}`}
                      className="group bg-white/50 dark:bg-gray-800/30 backdrop-blur-md border border-white/30 dark:border-gray-700/20 rounded-xl overflow-hidden shadow-sm hover:shadow-md hover:bg-white/60 dark:hover:bg-gray-800/40 transition-all duration-300">
                      <div className="aspect-square relative overflow-hidden">
                        <img
                          src={
                            member.name.includes('Yahweh')
                              ? member.imageUrl.yawe
                              : member.name.includes('Inaki')
                              ? member.imageUrl.inaki
                              : member.name.includes('Earl')
                              ? member.imageUrl.earl
                              : member.name.includes('Dennis')
                              ? member.imageUrl.dennis
                              : member.imageUrl.josh
                          }
                          alt={member.name}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      </div>

                      <div className="p-4">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                          {member.name}
                        </h3>
                        <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-2">
                          {member.role}
                        </p>

                        <div className="flex space-x-2">
                          <a
                            href={member.github}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200">
                            <FaGithub size={16} />
                          </a>
                          <a
                            href={member.linkedin}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200">
                            <FaLinkedin size={16} />
                          </a>
                          <a
                            href={member.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200">
                            <MdOutlineWeb size={16} />
                          </a>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          {/* Contact Section */}
          <div className="max-w-xl mx-auto">
            <div className="bg-white/50 dark:bg-gray-800/30 backdrop-blur-md border border-white/30 dark:border-gray-700/20 rounded-xl p-6 shadow-sm text-center">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                Get In Touch
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Have questions? We'd love to hear from you.
              </p>
              <a
                href="mailto:openspacereserve@gmail.com"
                target="_blank"
                className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors duration-200">
                <span className="mr-1">✉️</span>
                Contact Us
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default About;
