# import os
# import importlib
# registry = {}

# package_dir = os.path.dirname(__file__)

# for filename in os.listdir(package_dir):
#     if filename.endswith(".py") and filename not in ["__init__.py"]:
#         module_name = filename[:-3]
#         module = importlib.import_module(f".{module_name}", package=__name__)
        
#         # Check that both constants exist
#         if hasattr(module, "pattern") and hasattr(module, "query"):
#             registry[module_name] = {
#                 "pattern": module.pattern,
#                 "query": module.query,
#             }
