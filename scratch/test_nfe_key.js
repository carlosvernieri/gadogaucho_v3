const fs = require('fs');
const path = require('path');

// Simulate server execution context for parseChaveNFe
function parseXmlContent(xmlContent) {
  function getXmlTagValue(xml, tag) {
    const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`);
    const match = xml.match(regex);
    return match ? match[1].trim() : '';
  }
  function getXmlBlock(xml, tag) {
    const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`);
    const match = xml.match(regex);
    return match ? match[1] : '';
  }
  function inferItemCategory(descricao) {
    const d = descricao.toLowerCase();
    if (d.includes('sal') || d.includes('mineral') || d.includes('suplemento') || d.includes('ureia')) return 'Suplemento / Sal';
    if (d.includes('ração') || d.includes('farelo') || d.includes('milho') || d.includes('soja')) return 'Ração / Concentrado';
    return 'Geral';
  }

  const nNF = getXmlTagValue(xmlContent, 'nNF');
  const dhEmi = getXmlTagValue(xmlContent, 'dhEmi') || getXmlTagValue(xmlContent, 'dEmi');
  const dataEmissao = dhEmi ? dhEmi.substring(0, 10) : new Date().toISOString().substring(0, 10);
  const vNF = getXmlTagValue(xmlContent, 'vNF');
  const chaveNFe = getXmlTagValue(xmlContent, 'chNFe') || '';

  const emitBlock = getXmlBlock(xmlContent, 'emit');
  const emitNome = getXmlTagValue(emitBlock, 'xFant') || getXmlTagValue(emitBlock, 'xNome');
  const emitCpfCnpj = getXmlTagValue(emitBlock, 'CNPJ') || getXmlTagValue(emitBlock, 'CPF');
  const emitIE = getXmlTagValue(emitBlock, 'IE');

  let formattedCpfCnpj = emitCpfCnpj;
  if (emitCpfCnpj && emitCpfCnpj.length === 14) {
    formattedCpfCnpj = `${emitCpfCnpj.substring(0,2)}.${emitCpfCnpj.substring(2,5)}.${emitCpfCnpj.substring(5,8)}/${emitCpfCnpj.substring(8,12)}-${emitCpfCnpj.substring(12,14)}`;
  }

  const destBlock = getXmlBlock(xmlContent, 'dest');
  const destNome = getXmlTagValue(destBlock, 'xNome');

  const detRegex = /<det[^>]*>([\s\S]*?)<\/det>/g;
  const detMatches = [...xmlContent.matchAll(detRegex)];
  const itens = detMatches.map((match, idx) => {
    const detBlock = match[1];
    const prodBlock = getXmlBlock(detBlock, 'prod') || detBlock;
    const xProd = getXmlTagValue(prodBlock, 'xProd') || `Item ${idx + 1}`;
    const qCom = parseFloat(getXmlTagValue(prodBlock, 'qCom') || '1');
    const vUnCom = parseFloat(getXmlTagValue(prodBlock, 'vUnCom') || '0');
    const vProd = parseFloat(getXmlTagValue(prodBlock, 'vProd') || '0');
    const uCom = getXmlTagValue(prodBlock, 'uCom') || 'UN';

    return {
      descricao: xProd,
      quantidade: qCom,
      unidade: uCom,
      valor_unitario: vUnCom,
      valor_total: vProd,
      classificacao_item: inferItemCategory(xProd),
    };
  });

  return {
    numero_documento: nNF ? `NF-${nNF}` : 'S/N',
    chave_nfe: chaveNFe,
    data_pagamento: dataEmissao,
    valor_total: parseFloat(vNF || '0'),
    participante: {
      nome: emitNome || destNome || 'Participante Desconhecido',
      cpf_cnpj: formattedCpfCnpj || '',
      inscricao_estadual: emitIE || '',
    },
    itens,
  };
}

const xmlPath = path.join(__dirname, '..', 'data', 'nfe_samples', 'NFe_1782149394087296664.xml');
const xmlContent = fs.readFileSync(xmlPath, 'utf-8');
const result = parseXmlContent(xmlContent);
console.log('Result for sample XML:', JSON.stringify(result, null, 2));
