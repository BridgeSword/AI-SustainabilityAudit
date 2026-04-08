import os
from typing import Optional

from openai import OpenAI

from ..services.genai_apis import call_genaiapi#, call_hf_model

from ..core.utils import get_logger, extract_json
from ..core.constants import Constants


logger = get_logger(__name__)

class AgentBase:
    def __init__(self, 
                 genai_model: str, 
                 temperature: float, 
                 device: str=None, 
                 system_message: str=None):
        self.genai_model = genai_model.lower()

        self.history: list = []
        self.system_message: str = system_message

        self.tools = []

        self.critiques: list = []
        self.user_modification: Optional[str, None] = None

        self.opensource_models = Constants.OPENSOURCE_MODELS.value
        self.closedsource_models = Constants.CLOSEDSOURCE_MODELS.value

        self.temperature = temperature

        self.device = device

        self.base_url = None
        self.api_key = None

        if self.genai_model.startswith("openai"):
            self.base_url = "https://api.openai.com/v1/"
            self.api_key = os.getenv("OPENAI_API_KEY")

        elif self.genai_model.startswith("gemini"):
            self.base_url="https://generativelanguage.googleapis.com/v1beta/openai/"
            self.api_key=os.getenv("GEMINI_API_KEY")

        elif self.genai_model.startswith("claude"):
            self.base_url="https://api.anthropic.com/v1/"
            self.api_key=os.getenv("CLAUDE_API_KEY")

        else:
            self.base_url="http://localhost:11434/v1/"
            self.api_key="ollama"

        self.ai_client = OpenAI(
            base_url=self.base_url,
            api_key=self.api_key
        )


    def set_system_message(self, sys_msg):
        self.system_message = sys_msg
    

    def __call__(self, messages, json_out=False, store_history=True):
        if isinstance(messages, list):
            for message in messages:
                self.history.append({"role": "user", "content": message})
        else:
            self.history.append({"role": "user", "content": messages})

        result = self.execute()

        self.history.append({"role": "assistant", "content": result})

        if json_out:
            result = list(extract_json(result))

        if not store_history:
            self.clear_history()
            
        return result
    
    
    def clear_history(self):
        self.history = []


    def execute(self):
        response = None

        if any([ self.genai_model.startswith(_) for _ in self.closedsource_models + Constants.OLLAMA.value ]):
            response = call_genaiapi(SYSTEM_PROMPT=self.system_message,
                                     CHATS=self.history,
                                     ai_client=self.ai_client,
                                     temp=self.temperature,
                                     genai_model=self.genai_model)
        else:
            # TODO: Implement calling the HuggingFace API from here by passing in all the required Chat Parameters
            # response = call_hf_model(self.genai_model, self.history)
            pass

        return response
