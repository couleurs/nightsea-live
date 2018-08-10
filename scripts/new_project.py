import sys
import shutil
from pprint import pprint

SHADERS_FOLDER = '../assets/shaders/'
TEMPLATE_FOLDER = SHADERS_FOLDER + 'template'
PROJECTS_FOLDER = '../assets/patches/'

if len(sys.argv) > 1:
    project_name = sys.argv[1]
    shutil.copytree(TEMPLATE_FOLDER, PROJECTS_FOLDER + project_name)
else:
    pprint('You need to specify a project name')
