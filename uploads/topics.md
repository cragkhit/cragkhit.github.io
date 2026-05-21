Here is the revised consolidated list:

---

**Code Clone Detection and Code Similarity**

A foundational research area spanning clone search at scale (Siamese), clone configuration as an optimization problem, BigCloneBench evaluation, code clone lifecycles in pull requests and code review, and the application of image-based and machine-learning-based similarity techniques. Representative work includes the Siamese scalable clone search tool and studies such as "BigCloneBench Considered Harmful for Machine Learning" and "Code Clone Configuration as a Multi-Objective Search Problem." More recently, this line of research has extended into studying how code clones emerge and evolve in AI-assisted (human-AI collaborative) development contexts.

---

**Coding Proficiency Assessment**

A growing thread inspired by applying language-proficiency frameworks (e.g., CEFR) to programming languages. Tools such as pycefr and jscefr enable automated measurement of Python and JavaScript code proficiency, with empirical studies extending into OSS projects (PyGress) and textbook analysis. The question of when AI-generated code is difficult to comprehend also connects naturally to this space, linking code quality assessment with LLM-generated output.

---

**AI-Generated Code Analysis and Detection**

An emerging focus investigating LLM-generated code from multiple angles. This includes detecting and explaining ChatGPT-generated programs (NPC tool, AI Literacy in Code book chapter), studying the autorepairability of ChatGPT and Gemini, and examining code clone genealogies in human-AI collaborative development. The overarching concern is understanding the quality, comprehensibility, and trustworthiness of code produced by AI agents in practice.

---

**Metamorphic Testing and LLM Trustworthiness**

Research applying software testing principles to verify the reliability of large language models. This includes the PromptOps tool for testing LLM trustworthiness, the paper "Test It Before You Trust It: Applying Software Testing for Trustworthy In-context Learning," and natural language explanation in code clone detection using LLM-based post-hoc explainers. The core idea is that SE testing methodologies can serve as a rigorous lens for evaluating AI system behavior.

---

**Mining Software Repositories (MSR) and Empirical Software Engineering**

A broad methodological thread running through most of the work, involving large-scale analysis of software artifacts. Representative studies include mining characteristics of Jupyter Notebooks in data science projects, studying Gitcoin issue resolution outcomes, social media reactions to AI-powered GitHub projects on Hacker News, and the Sprint2Vec deep characterization of agile sprints published in IEEE TSE. These studies use repository data to draw empirically grounded conclusions about software development practices.

---

**Software Engineering Practices in Thailand (SE in Industry & COVID Impact)**

A sustained effort to understand and improve software development in the Thai software industry. Key outputs include the EMSE 2024 paper on adoption of automated SE tools and techniques in Thailand, the JSS 2026 paper on automated SE knowledge transfer for SMEs, and studies on identifying SE challenges in Thai SMEs conducted in collaboration with UCL. The impact of COVID-19 and remote work on Thai software development has also been empirically documented.

---

**Software Security and Dependency Management**

An active line of work focusing on open-source security vulnerability reporting and dependency chains. This includes studies on SECURITY.md policy adoption in Python libraries, analysis of vulnerability reporting mechanisms on GitHub (SANER'25), transitive security vulnerability visualization (V-Achilles tool), and exploration of security practices in the PyPI dependency ecosystem. The unifying concern is how security knowledge is documented, propagated, and acted upon across OSS ecosystems.

---

**Code Review Analysis**

A multi-year thread examining what code review does (and does not) achieve in practice. Studies include whether code review removes coding convention violations, the impact of code review on architectural changes (TSE), and the AILINKPREVIEWER tool enhancing code reviews with LLM-powered link previews. Recommending code improvements derived from Stack Overflow answer edits also falls within this space.

---

**Software Engineering for Data Science (SE4DS) and Jupyter Notebooks**

Research investigating how SE practices apply in data science workflows. Work here includes mining Jupyter Notebook characteristics in data science projects, studying competitive coding and code reuse in notebooks (APSEC'22), and the Typhon tool for automatic recommendation of relevant code cells in Jupyter Notebooks. This thread bridges traditional SE methodology with the emerging practices of data scientists.

---

**Technical Debt and Self-Admitted Technical Debt (SATD)**

Research focused on detecting, classifying, and managing technical debt in software projects. Examples include the FixMe GitHub bot for detecting and monitoring on-hold self-admitted technical debt (ASE'21) and the use of N-gram IDF for automatically classifying SATD. These tools bring automation to the otherwise manual identification of quality debt in codebases.

---

These ten topics collectively capture the intellectual core of the research portfolio: a strong empirical methodology, deep roots in code analysis and clone detection, and an expanding frontier into AI-generated code quality and LLM trustworthiness.