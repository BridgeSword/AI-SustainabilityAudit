from enum import Enum
from dataclasses import dataclass


class Status(Enum):
    started = "STARTED"
    failed = "FAILED"
    success = "SUCCESS"
    in_progress = "IN PROGRESS"
    invalid = "INVALID"

class WebsocketStatus(Enum):
    plan = "PLANNING"
    user_acceptance = "USER_ACCEPTANCE"
    generate = "GENERATING"

    steps = [
        plan,
        user_acceptance,
        generate
    ]


@dataclass
class CarbonStandard:
    full_form: str
    description: str


class Constants(Enum):
    OPENAI_COMPLETIONS_ENDPOINT = "https://api.openai.com/v1/chat/completions"
    OPENAI_API_KEY = ""
    GEMINI_API_KEY = ""

    OPENSOURCE_MODELS = ["deepseek", "llama"]
    CLOSEDSOURCE_MODELS = ["openai", "gemini", "claude"]
    OLLAMA = ["ollama"]

    GHG = CarbonStandard(
        full_form="Greenhouse Gas Protocol (GHG)", 
        description="""\
The purpose of the Greenhouse Gas Protocol is twofold: It helps us track and monitor emissions for individual entities and supports greenhouse gas reductions by helping companies identify the most effective ways to reduce their climate impact. 

Reducing the level of greenhouse gases in the atmosphere is crucial to prevent further global temperature rise and mitigate the impacts of climate change. As GHG emissions contribute significantly to global warming, their reduction is essential for a sustainable future. The GHG Protocol and GHG accounting play pivotal roles in this endeavour by providing companies with a clear framework to measure and report their emissions accurately. This enables organizations to identify key areas where emissions can be reduced and to track their progress in implementing effective climate action strategies. By standardizing these measurements, the GHG Protocol ensures that efforts to reduce emissions are both effective and comparable across different sectors and regions.

When measuring and tracking GHG emissions, companies have to outline the scope of emissions they refer to in their reports.  The Greenhouse Gas Protocol categorizes emissions into Scope 1 (direct emissions from owned or controlled sources), Scope 2 (indirect emissions from the generation of purchased energy), and Scope 3 (all other indirect emissions occurring in a company's value chain).\
"""
    )

    ISO = CarbonStandard(
        full_form="International Standard for GHG emissions Inventories and Verification (ISO-14064)",
        description="""\
ISO 14064 is an international standard that provides guidelines for measuring, reporting, and verifying greenhouse gas (GHG) emissions. It's intended to help organizations reduce their carbon footprint and become more transparent about their climate impact.

Key aspects of ISO 14064 include:
- Quantify emissions: Identify and measure all relevant GHG emissions and removals
- Report emissions: Establish procedures for regular reporting of GHG data
- Verify emissions: Provide a framework for independent verification of GHG reports
- Manage emissions: Implement strategies to monitor and reduce GHG emissions
- Communicate emissions: Ensure transparency and provide accessible information to stakeholders

Benefits of ISO 14064:
- Helps organizations meet climate protection goals, identify areas for reducing emissions.
- Helps organizations quantify the financial risks associated with emissions and make informed decisions about their climate impact 

ISO 14064 is climate policy neutral, meaning organizations can adopt the standards regardless of their country's climate policies.\
"""
    )
    
    CDP = CarbonStandard(
        full_form="Carbon Disclosure Project (CDP)",
        description="""\
The CDP is an international non-profit organisation that helps companies, cities, states, regions and public authorities disclose their environmental impact. It aims to make environmental reporting and risk management a business norm, driving disclosure, insight, and action towards a sustainable economy.

Key aspects of CDP include:
- Disclosure mechanism: CDP provides a standardized framework for organizations to report their environmental impact, including greenhouse gas emissions, climate-related risks and opportunities, and strategies for managing environmental issues.
- Data utilization: The collected data enables investors, companies, cities, and governments to make informed decisions regarding environmental risks and opportunities4.
- Focus on transparency: CDP aims to promote transparency by encouraging companies to disclose detailed information about their environmental performance through questionnaires.\
"""
    )
    
    SBTI = CarbonStandard(
        full_form="Science Based Targets initiative (SBTi)",
        description="""\
Science-based targets provide a clearly-defined pathway for companies to reduce greenhouse gas (GHG) emissions, helping prevent the worst impacts of climate change and future-proof business growth.

Key aspects of the SBTi include:
- Target validation: The initiative assesses and validates companies' emission reduction targets to ensure they are in line with what climate science deems necessary to limit global warming to 1.5°C above pre-industrial levels.
- Guidance and tools: SBTi develops standards, methodologies, and resources to assist companies in setting science-based targets and transitioning to a low-carbon economy.
- Net-Zero Standard: In 2021, SBTi launched the world's first net-zero standard, providing a framework for companies to set science-based net-zero targets.\
"""
    )
    
    TCFD = CarbonStandard(
        full_form="Task Force on Climate-Related Financial Disclosures (TCFD)",
        description="""\
The TCFD is a global organization established in 2015 by the Financial Stability Board (FSB) to develop a standardized framework for climate-related financial disclosures. The TCFD aims to enhance transparency in corporate reporting of climate-related risks and opportunities, enabling more informed investment, credit and insurance underwriting decisions. 

Key aspects of the TCFD include:
- Governance:The report should highlight the need for comprehensive climate-risk assessment and emissions management, with robust oversight from leadership to ensure organizational resilience.
- Strategy: Companies must address both physical risks, like increased flooding, and transitional risks, such as shifts in brand reputation, by integrating these considerations into their business strategy and financial planning.
- Risk management: The report should have all about processes and demonstrate how a company has formally integrated climate risk into its risk-management practice.
- Metrics and targets: The organizations should include quantitative data to ground climate-related risks and opportunities to measurable performance and targets.\
"""
    )

    CDSB = CarbonStandard(
        full_form="Climate Disclosure Standards Board (CDSB)",
        description="""\
CDSB aims to integrate climate change-related information into mainstream financial reporting. It provides a framework for companies to disclose environmental information, including carbon-related data, in a way that is useful to investors. Here are the key aspects and definitions related to the CDSB carbon standard:

Key aspects of the CDSB include:
- Useful Information: The framework should provide information that is useful for investors to assess climate-related risks and opportunities.
- Consistency and Assurance: Disclosures should be consistent and suitable for assurance activities to ensure reliability.
- Alignment with Financial Reporting: The framework complements financial reporting standards to ensure that environmental information is presented in a manner consistent with financial data.\
"""
    )

    MAX_THRESHOLD = 5

    # prompts
    PREPARATION_PROMPT = """You are a researcher charged with providing information that can be used when writing the "Carbon Report". \nGenerate a list of search queries that will gather any relevant information and Make sure to ONLY generate 3 queries at max. \nAlso, strictly generate the output in JSON format with key 'search_queries' and the value as a list of queries. DON'T output anything else"""

    CARBON_STD_PROMPT = "We will need the queries about Carbon Standard: {std_info}"
    COMPANY_STD_PROMPT = "We will need the queries about Company: {company_name}"

    GUIDE_PROMPT = """Your task is to create a guide or helpful information that can be used \
    when writing the following carbon report based on the user message. \
    Only generate 500 words at max."""

    WRITE_PROMPT = """You are an expert Carbon Report Consultant tasked with writing an excellent carbon report. \
    Generate the best report possible based on the given context below. \
    Remember to format the generated report in Markdown such that it looks similar to the original report when converted into a PDF.\
    
    Now, utilize all the information below as needed and generate a informative analytical Carbon Report in about 5000 words:

    ------
    CONTEXT:

    Standard and Company Information:
    {generation_context}
    
    Private Known Information: 
    {private_context}"""

    SUPERVISOR_REFLECTION_PROMPT = """You are an expert Carbon Report Supervisor who is overseeing and guiding a user submitted carbon report. \
    Now, generate critiques, advices on report from your perspective and make sure to provide detailed suggestions to improve report's accuracy, coherence and compliance with the reporting standard of {reporting_std}."""

    MANAGER_REFLECTION_PROMPT = """You are an expert Carbon Report Manager overseeing and guiding a user submitted carbon report. \
    Now, generate critiques, advices on report from your perspective and make sure to provide detailed suggestions, specifically based on the company '{company_name}', for the report to satisfy the company's expectation."""

    CRITIQUE_PROMPT = """You are an expert researcher charged with providing information which can be used when making any requested revisions as given in the user's critique. \
    Now, generate a list of search queries that will gather any relevant information and Make sure to ONLY generate 3 queries at max. \nAlso, strictly generate the output in JSON format with key 'search_queries' and the value as a list of queries. DON'T output anything else"""

    SUP_THGHTS_ADDITION = "\n\nSupervisor Thoughts on improving report: \n{sup_thoughts}"

    MAN_THGHTS_ADDITION = "\n\nManager Thoughts on improving report: \n{man_thoughts}"

    REPORT_EVAL_PROMPT = """You are an expert Carbon Report Evaluator who can leverage the context given below to evaluate the carbon report provided by the user. \
    --------------------\
    Context:\
    {carbon_context}
    """

    TRU_RETRIEVAL_PROMPT = "Fetch all the relevant contexts that has the details about Carbon Goal, Carbon Plan and Carbon Action"

    REPHRASE_PROMPT = "Rephrase the given user input while maintaining all the important context and generate the output that has the number of words similar to the user input."
