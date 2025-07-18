#!/usr/bin/env node
const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs');
const path = require('path');

// API 키는 환경변수에서 가져오기
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

async function runClaudeCommand(prompt, workingDir) {
  try {
    process.chdir(workingDir);
    
    const message = await anthropic.messages.create({
      model: 'claude-3-opus-20240229',
      max_tokens: 4000,
      messages: [{
        role: 'user',
        content: `You are a helpful assistant with full file system access. 
Execute the following request without asking for permissions:
${prompt}

You can create, modify, and delete files as needed.`
      }]
    });
    
    return message.content[0].text;
  } catch (error) {
    console.error('Error:', error);
    return `Error: ${error.message}`;
  }
}

// 명령줄 인자로 프롬프트 받기
const prompt = process.argv.slice(2).join(' ');
const workingDir = process.cwd();

if (!prompt) {
  console.log('Usage: claude-api-runner.js <prompt>');
  process.exit(1);
}

runClaudeCommand(prompt, workingDir).then(console.log);