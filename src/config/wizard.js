import inquirer from 'inquirer';
import path from 'path';
import { validateProjectPath, sanitizeProjectName } from '../utils/validator.js';
import { expandHomePath, resolveAbsolutePath } from '../utils/path.js';
import logger from '../utils/logger.js';

export class ConfigWizard {
  constructor(configManager) {
    this.configManager = configManager;
  }

  async run() {
    console.log('\n🚀 欢迎使用编码时间监控工具配置向导！\n');
    
    const answers = await this.askQuestions();
    
    for (const projectPath of answers.projects) {
      await this.addProject(projectPath);
    }
    
    await this.configManager.save();
    
    console.log('\n✅ 配置完成！\n');
    console.log('提示：使用 "ctm start" 启动监控服务\n');
  }

  async askQuestions() {
    const questions = [
      {
        type: 'confirm',
        name: 'addMore',
        message: '是否添加要监控的项目？',
        default: true
      }
    ];

    const answers = {
      projects: []
    };

    let addMore = true;
    while (addMore) {
      const currentDir = process.cwd();
      const projectQuestions = [
        {
          type: 'input',
          name: 'path',
          message: '请输入项目路径:',
          default: currentDir,
          validate: async (input) => {
            if (!input || input.trim() === '') {
              return '路径不能为空';
            }
            
            const result = await validateProjectPath(input);
            if (!result.valid) {
              return result.error;
            }
            
            return true;
          },
          filter: (input) => resolveAbsolutePath(input)
        },
        {
          type: 'input',
          name: 'name',
          message: '项目名称（可选，默认使用目录名）:',
          default: (answers) => {
            const dirName = answers.path.split(path.sep).pop();
            return sanitizeProjectName(dirName);
          },
          filter: sanitizeProjectName
        }
      ];

      const projectAnswers = await inquirer.prompt(projectQuestions);
      answers.projects.push(projectAnswers);

      const { confirm } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirm',
          message: '是否继续添加更多项目？',
          default: false
        }
      ]);

      addMore = confirm;
    }

    return answers;
  }

  async addProject(projectConfig) {
    const project = {
      name: projectConfig.name,
      path: projectConfig.path
    };

    this.configManager.addProject(project);
    logger.info(`添加项目: ${project.name} (${project.path})`);
  }
}

export default ConfigWizard;
