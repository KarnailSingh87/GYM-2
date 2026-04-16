#!/usr/bin/env node
import bcrypt from 'bcrypt';

async function main(){
  const pwd = process.argv[2];
  if(!pwd){
    console.error('Usage: node generate_hash.js <password>');
    process.exit(1);
  }
  const hash = await bcrypt.hash(pwd, 10);
  console.log(hash);
}

main();
