import { useState } from 'react';
import { FaGithub, FaLinkedin } from 'react-icons/fa';
import josh from '../../assets/profile_pic/josh.jpg';
import dennis from '../../assets/profile_pic/dennis.jpg';
import yawe from '../../assets/profile_pic/yawe.jpg';
import inaki from '../../assets/profile_pic/inaki.jpg';
import earl from '../../assets/profile_pic/earl.jpg';
import { MdOutlineWeb } from 'react-icons/md';

const About = () => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

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
    <div className="min-h-screen px-4 py-8 md:py-16 bg-light dark:bg-darkBlue text-darkBlue dark:text-light transition-all duration-300">
      <div className="max-w-5xl mx-auto space-y-16">
        {/* Hero Section */}
        <div className="space-y-6 text-center">
          <h1 className="text-4xl md:text-5xl font-bold">About OpenSpace</h1>
          <p className="text-xl max-w-3xl mx-auto text-gray-700 dark:text-gray-300">
            A modern platform for finding and booking collaborative workspaces
            that inspire creativity and productivity.
          </p>
        </div>

        {/* Mission Section */}
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <h2 className="text-3xl font-bold">Our Mission</h2>
          <p className="text-gray-700 dark:text-gray-300">
            OpenSpace was founded with a simple mission: to connect
            professionals with inspiring workspaces where they can thrive. We
            believe that the right environment can fuel innovation and
            collaboration.
          </p>
          <p className="text-gray-700 dark:text-gray-300">
            By making it easy to discover, compare, and book workspaces, we're
            helping to create a more flexible and productive work culture for
            everyone.
          </p>
        </div>

        {/* Features Section */}
        <div className="space-y-10">
          <h2 className="text-3xl font-bold text-center">What We Offer</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {['Curated Workspaces', 'Seamless Booking', 'Verified Reviews'].map(
              (feature, index) => (
                <div
                  key={index}
                  className="p-6 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm hover:shadow-md transition-all duration-300 bg-white dark:bg-gray-800">
                  <h3 className="text-xl font-semibold mb-3">{feature}</h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut
                    elit tellus, luctus nec ullamcorper mattis.
                  </p>
                </div>
              )
            )}
          </div>
        </div>

        {/* Team Section */}
        <div className="space-y-12">
          <h2 className="text-3xl font-bold text-center">Our Team</h2>

          {/* Founder Section */}
          {team
            .filter((member) => member.isFounder)
            .map((founder, index) => (
              <div
                key={`founder-${index}`}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden transition-all duration-300 hover:shadow-lg">
                <div className="flex flex-col md:flex-row">
                  <div className="md:w-1/3 h-64 md:h-auto relative overflow-hidden">
                    <img
                      src={founder.imageUrl.josh}
                      alt={founder.name}
                      className="w-full h-full object-cover object-center"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end md:hidden">
                      <div className="p-4 text-white">
                        <h3 className="text-xl font-bold">{founder.name}</h3>
                        <p className="text-sm text-white/80">{founder.role}</p>
                      </div>
                    </div>
                  </div>

                  <div className="md:w-2/3 p-6 flex flex-col justify-between">
                    <div>
                      <h3 className="text-2xl font-bold text-darkBlue dark:text-white hidden md:block">
                        {founder.name}
                      </h3>
                      <p className="text-blue-600 dark:text-blue-400 font-medium mb-3 hidden md:block">
                        {founder.role}
                      </p>
                      <p className="text-gray-700 dark:text-gray-300 mb-4">
                        {founder.description}
                      </p>
                    </div>

                    <div className="flex space-x-4 mt-4">
                      <a
                        href={founder.github}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-600 dark:text-gray-400 hover:text-darkBlue dark:hover:text-light transition-colors">
                        <FaGithub size={20} />
                      </a>
                      <a
                        href={founder.linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-600 dark:text-gray-400 hover:text-darkBlue dark:hover:text-light transition-colors">
                        <FaLinkedin size={20} />
                      </a>
                      <a
                        href={founder.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-600 dark:text-gray-400 hover:text-darkBlue dark:hover:text-light transition-colors">
                        <MdOutlineWeb size={20} />
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            ))}

          {/* Team Members Section */}
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-center text-gray-700 dark:text-gray-300">
              Team Members
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
              {team
                .filter((member) => !member.isFounder)
                .map((member, index) => (
                  <div
                    key={`member-${index}`}
                    className="flex flex-col md:flex-row bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all duration-300"
                    onMouseEnter={() => setHoveredIndex(index)}
                    onMouseLeave={() => setHoveredIndex(null)}>
                    <div className="md:w-1/3 h-48 md:h-auto relative overflow-hidden">
                      {/* Use the correct image property based on the member name */}
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
                        className={`w-full h-full object-cover transition-transform duration-300 ${
                          hoveredIndex === index ? 'scale-105' : ''
                        }`}
                      />
                    </div>

                    <div className="md:w-2/3 p-5">
                      <h3 className="text-lg font-semibold text-darkBlue dark:text-white">
                        {member.name}
                      </h3>
                      <p className="text-blue-600 dark:text-blue-400 text-sm mb-2">
                        {member.role}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                        {member.description}
                      </p>

                      <div className="flex space-x-3 mt-2">
                        <a
                          href={member.github}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gray-600 dark:text-gray-400 hover:text-darkBlue dark:hover:text-light transition-colors">
                          <FaGithub size={18} />
                        </a>
                        <a
                          href={member.linkedin}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gray-600 dark:text-gray-400 hover:text-darkBlue dark:hover:text-light transition-colors">
                          <FaLinkedin size={18} />
                        </a>
                        <a
                          href={member.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gray-600 dark:text-gray-400 hover:text-darkBlue dark:hover:text-light transition-colors">
                          <MdOutlineWeb size={18} />
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>

        {/* Contact Section */}
        <div className="text-center space-y-4 py-8">
          <h2 className="text-3xl font-bold">Get In Touch</h2>
          <p className="text-gray-700 dark:text-gray-300 max-w-2xl mx-auto">
            Have questions about OpenSpace? We'd love to hear from you.
          </p>
          <button className="mt-4 px-6 py-3 bg-darkBlue text-light dark:bg-light dark:text-darkBlue rounded-lg hover:scale-105 transition-all duration-300">
            <a href="mailto:openspacereserve@gmail.com" target="_blank">
              Contact Us
            </a>
          </button>
        </div>
      </div>
    </div>
  );
};

export default About;
