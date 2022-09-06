export const CAPABILITIES_WITH_DESCRIPTIONS = [
  {
    name: "Agile Coaching",
    description: [
      "Embed an Agile culture using techniques from a wide range or Agile and lean methodologies and frameworks, while being methodology agnostic",
      "Help create an open and trust-based environment, which enables a focus on delivery and facilitates continuous improvement",
      "Assess the culture of a team and delivery processes in place to identify improvements and facilitate these improvements with the right type of support",
      "Showcase relevant tools and techniques such as coaching, advising, workshops, and mentoring",
      "Engage with stakeholders at all levels of an organization",
      "Develop clear lines of escalation, in agreement with senior managers",
      "Ensure any stakeholder can easily find out an accurate and current project or program status, without disruption to delivery",
      "Apply best tools and techniques to: team roles, behaviours, structure and culture, Agile ceremonies and practices, knowledge transfer and sharing, program management, cross-team coordination, and overall governance of digital service delivery",
      "Ensure key metrics and requirements that support the team and delivery are well defined and maintained",
      "Equip staff with the ability to coach others",
      "Provide executive coaching on the fundamental considerations of digital service delivery design"
    ]
  },
  {
    name: "Backend Development",
    description: [
      "Web development using open-source web programming languages (e.g., Ruby, Python) and frameworks (e.g., Django, Rails)",
      "Develop and consume web-based, RESTful APIs",
      "Use and work in team environments that use Agile methodologies (e.g., Scrum, Lean)",
      "Author developer-friendly documentation (e.g., API documentation, deployment operations)",
      "Test-driven development",
      "Use version control systems, specifically Git and GitHub",
      "Quickly research and learn new programming tools and techniques",
      "Work with relational and non-relational database systems",
      "Use scalable search technology (e.g. ElasticSearch, Solr)",
      "Handle large data sets and scaling their handling and storage",
      "Use and work with open source solutions and community",
      "Communicate technical concepts to a non-technical audience"
    ]
  },
  {
    name: "Delivery Management",
    description: [
      "Deliver projects and products using the appropriate Agile project management methodology, learning & iterating frequently",
      "Work with  product managers to define the roadmap for any given product and translating this into user stories",
      "Lead the collaborative, dynamic planning process – prioritizing the work that needs to be done against the capacity and capability of the team",
      "Matrix-manage a multi-disciplinary team",
      "Ensure all products are built to an appropriate level of quality for the stage (alpha/beta/implementation)",
      "Actively and openly share knowledge of best practices"
    ]
  },
  {
    name: "DevOps Engineering",
    description: [
      "Deploy and configure services using infrastructure as a service providers (e.g., Amazon Web Services, Microsoft Azure, Google Compute Engine, RackSpace/OpenStack)",
      "Configure and manage Linux-based servers to serve a dynamic website",
      "Debug cluster-based computing architectures",
      "Use scripting or basic programming skills to solve problems",
      "Install and manage open source monitoring tools",
      "Configure management tools (e.g., Puppet, Chef, Ansible, Salt)",
      "Create architecture for continuous integration and deployment, and continuous monitoring",
      "Use containerization technologies (e.g., LXC, Docker, Rocket)"
    ]
  },
  {
    name: "Frontend Development",
    description: [
      "Frontend web development using modern techniques and frameworks (e.g., HTML5, CSS3, CSS frameworks like LESS and SASS, Responsive Design, Bourbon, Twitter Bootstrap)",
      "JavaScript development using modern standards, including strict mode compliance, modularization techniques and tools, and frameworks and libraries (e.g., jQuery, MV* frameworks such as Backbone.js and Ember.js, D3)",
      "Consume RESTful APIs",
      "Use and work in team environments that use Agile methodologies (e.g., Scrum, Lean)",
      "Use version control systems, specifically Git and GitHub",
      "Quickly research and learn new programming tools and techniques",
      "Use and work with open source solutions and community",
      "Create web layouts from static images",
      "Create views and templates in full-stack frameworks like Rails, Express, or Django"
    ]
  },
  {
    name: "Security Engineering",
    description: [
      "Perform security audits, risk analysis, application-level vulnerability testing, and security code reviews",
      "Develop and implement technical solutions to help mitigate security vulnerabilities",
      "Conduct research to identify new attack vectors"
    ]
  },
  {
    name: "Technical Architecture",
    description: [
      "Architect the overall system, by using prototyping and proof of concepts, which may include: modern programming languages (e.g., Ruby, Python, Node.js) and web frameworks (e.g., Django, Rails); modern front-end web programming techniques (e.g., HTML5, CSS3, RESTful APIs) and frameworks (e.g., Twitter Bootstrap, jQuery); relational databases (e.g., PostgreSQL), and “NoSQL” databases (e.g., Cassandra, MongoDB); automated configuration management (e.g., Chef, Puppet, Ansible, Salt), continuous integration/deployment, and continuous monitoring solutions",
      "Use version control systems, specifically Git and GitHub",
      "Ensure strategic alignment of technical design and architecture to meet business growth and direction, and stay on top of emerging technologies",
      "Deconstruct business and system architecture to support clean-interface multi-team development",
      "Develop product roadmaps, backlogs, and measurable success criteria, and writing user stories (i.e., can establish a path to delivery for breaking down stories)",
      "Clearly communicate and work with stakeholders at every level"
    ]
  },
  {
    name: "User Experience Design",
    description: [
      "Use and work in team environments that use Agile methodologies (e.g., Scrum, Lean)",
      "Build consensus with a product team on features that will meet business goals and deliver value to users",
      "Turn user-centered design heuristics and user research into product designs ",
      "Represent product designs visually from low- to -high fidelity as needed",
      "Work effectively with developers to implement designs accurately and quickly so they can be tested with users",
      "Conduct usability testing, communicating test results to the team and influencing the team to prioritize improvements based on the results",
      "Produce quantitative and qualitative evidence to show that user experience is successful and improving",
      "Create and maintain well-documented design patterns"
    ]
  },
  {
    name: "User Research",
    description: [
      "Use and work in team environments that use Agile methodologies (e.g., Scrum, Lean)",
      "Lead groups to identify their target users and come to consensus about what needs to be learned ",
      "Identify, plan, coordinate and execute quantitative and qualitative research activities ",
      "Plan and conduct research in such a way as to get regular and frequent feedback from users and bring findings to bear iteratively on product development",
      "Influence other product team members to participate in conducting research and interpreting findings",
      "Effectively communicate research insights to team members and broader audiences verbally and through compelling artifacts such as user journey maps, personas or storytelling presentations ",
      "Make recommendations for product design and producing design ideas based on evidence",
      "Influence a product team to prioritize user needs and make evidence-based decisions"
    ]
  }
];

const CAPABILITY_NAMES_ONLY = CAPABILITIES_WITH_DESCRIPTIONS.map(
  ({ name }) => name
);

export default CAPABILITY_NAMES_ONLY;
