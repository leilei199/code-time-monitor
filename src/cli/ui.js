import chalk from 'chalk';
import ora from 'ora';

export class CLIUI {
  static spinner(message) {
    return ora({
      text: message,
      color: 'cyan',
      spinner: 'dots'
    });
  }

  static success(message) {
    console.log(chalk.green('✓') + ' ' + message);
  }

  static error(message) {
    console.log(chalk.red('✗') + ' ' + message);
  }

  static info(message) {
    console.log(chalk.blue('ℹ') + ' ' + message);
  }

  static warning(message) {
    console.log(chalk.yellow('⚠') + ' ' + message);
  }

  static title(message) {
    console.log('\n' + chalk.bold.cyan(message) + '\n');
  }

  static section(message) {
    console.log('\n' + chalk.bold(message));
    console.log('─'.repeat(message.length));
  }

  static keyValue(key, value) {
    console.log(`  ${chalk.cyan(key)}: ${value}`);
  }

  static list(items) {
    items.forEach((item, index) => {
      console.log(`  ${chalk.gray(index + 1 + '.')} ${item}`);
    });
  }

  static table(headers, rows) {
    const columnWidths = headers.map((header, index) => {
      const maxWidth = Math.max(
        header.length,
        ...rows.map(row => String(row[index]).length)
      );
      return maxWidth + 2;
    });

    // Print header
    const headerLine = headers.map((header, index) => {
      return chalk.bold(header.padEnd(columnWidths[index]));
    }).join('');
    console.log(headerLine);

    // Print separator
    const separator = columnWidths.map(width => '─'.repeat(width)).join('');
    console.log(separator);

    // Print rows
    rows.forEach(row => {
      const rowLine = row.map((cell, index) => {
        return String(cell).padEnd(columnWidths[index]);
      }).join('');
      console.log(rowLine);
    });
  }

  static progressBar(current, total, width = 40) {
    const percentage = Math.round((current / total) * 100);
    const filled = Math.round((current / total) * width);
    const empty = width - filled;
    
    const bar = '█'.repeat(filled) + '░'.repeat(empty);
    return `${chalk.cyan('[')}${bar}${chalk.cyan(']')} ${percentage}%`;
  }

  static box(content, title = '') {
    const lines = content.split('\n');
    const maxLength = Math.max(...lines.map(line => line.length), title.length);
    
    const horizontal = '─'.repeat(maxLength + 2);
    const padding = ' '.repeat(maxLength + 2);
    
    console.log(chalk.cyan('┌' + horizontal + '┐'));
    
    if (title) {
      const titlePadding = ' '.repeat((maxLength - title.length) / 2);
      console.log(chalk.cyan('│') + titlePadding + chalk.bold(title) + titlePadding + chalk.cyan('│'));
      console.log(chalk.cyan('│') + padding + chalk.cyan('│'));
    }
    
    lines.forEach(line => {
      const linePadding = ' '.repeat(maxLength - line.length);
      console.log(chalk.cyan('│') + ' ' + line + linePadding + ' ' + chalk.cyan('│'));
    });
    
    console.log(chalk.cyan('└' + horizontal + '┘'));
  }
}

export default CLIUI;