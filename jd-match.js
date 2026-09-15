(function(root){
  // Conservative local evidence retrieval, not an assessment of candidate ability.
  const concepts=[
    ['SQL',/\bSQL\b/i],['Python',/\bPython\b/i],['Excel',/\bExcel\b/i],['Figma',/\bFigma\b/i],
    ['Java',/\bJava\b/i],['JavaScript',/\bJavaScript\b/i],['Tableau',/\bTableau\b/i],
    ['Power BI',/\bPower\s*BI\b/i],['数据分析',/数据分析|分析数据|data analys(?:is|t|e)/i],
    ['数据清洗',/数据清洗|清洗.{0,8}数据|data cleaning/i],['用户研究',/用户研究|用户调研|用户访谈|用户问卷|user research/i],
    ['问卷',/问卷|survey/i],['访谈',/访谈|interview/i],['内容运营',/内容运营|内容策划|选题策划|content strategy/i],
    ['社群运营',/社群运营|社群管理|community management/i],['用户增长',/用户增长|拉新|增长实验|user growth/i],
    ['A/B 测试',/A\s*\/\s*B|AB测试|ab testing/i],['产品设计',/产品设计|产品原型|product design/i],
    ['需求分析',/需求分析|需求调研|需求文档|requirements analysis/i],['跨部门协作',/跨部门|跨团队|cross.functional/i],
    ['项目管理',/项目管理|项目排期|project management/i],['法律检索',/法律检索|类案检索|法理检索|legal research/i],
    ['法律文书',/法律文书|起诉状|答辩状|legal drafting/i],['合规',/合规|compliance/i],
    ['劳动法',/劳动法|劳动争议|labor law|employment law/i],['知识产权',/知识产权|intellectual property/i],
    ['AI Agent',/\b(?:AI\s*)?Agent\b|智能体/i],['Prompt',/\bPrompt(?:\s*Engineering)?\b|提示词/i],
    ['大模型',/大模型|LLM|ChatGPT|Claude|Gemini|DeepSeek/i],['英语',/英语|英文|English/i],
    ['CET-6',/CET[- ]?6|英语六级|大学英语六级/i],['CET-4',/CET[- ]?4|英语四级/i],
    ['法律职业资格',/法律职业资格|法考/i]
  ];
  const action=/负责|完成|开展|执行|设计|开发|实现|构建|搭建|整理|清洗|分析|调研|访谈|检索|起草|组织|优化|运营|测试|使用|运用|参与|主导|led\b|built\b|developed\b|conducted\b|implemented\b|used\b/i;
  const uncertainty=/未掌握|不熟悉|不了解|未使用|没有.{0,8}经验|无.{0,8}经验|尚未|计划学习|计划使用|希望学习|准备学习|拟开展|拟使用|no experience|not familiar|plan to|want to learn/i;
  const intended=/计划|拟|建议|提出|方案|原型验证|plan|propos/i;
  function parse(jd){
    const result=[];let section='待核对';
    for(const raw of String(jd||'').replace(/\r\n?/g,'\n').split('\n')){
      let line=raw.trim();if(!line)continue;
      const heading=/^(岗位职责|工作职责|工作内容|职责描述|任职要求|岗位要求|任职资格|加分项|优先条件|福利待遇|薪酬福利|公司介绍|关于我们|responsibilities|requirements|qualifications|preferred qualifications|benefits)\s*[:：]?\s*(.*)$/i.exec(line);
      if(heading){const h=heading[1];section=/福利|公司|关于|benefits/i.test(h)?'背景信息':/加分|优先|preferred/i.test(h)?'加分项':/职责|内容|responsibilities/i.test(h)?'职责':'要求';line=heading[2];if(!line)continue;}
      if(section==='背景信息')continue;
      const original=line;
      for(let clause of line.split(/[；;。\n]+/)){
        clause=clause.replace(/^\s*(?:[•·●\-*]|\d+[.、)）]|[一二三四五六七八九十]+、)\s*/,'').trim();if(!clause)continue;
        const found=concepts.filter(([,re])=>re.test(clause)).map(([name])=>name);
        const constraint=/学历|本科|硕士|博士|学士|大专|\d+\s*年|每周|天\/周|到岗|实习.{0,4}个月|应届|在校|毕业|bachelor|master|phd|years?|availability/i.test(clause);
        const priority=/不限|无需|不要求|不强制|not required/i.test(clause)?'非强制':/优先|加分|有则更佳|preferred|nice.to.have/i.test(clause)||section==='加分项'?'加分项':/必须|至少|要求|需具备|必备|required|must|minimum/i.test(clause)?'明确要求':'未标注强制性';
        result.push({id:result.length,original,clause,section,priority,concepts:found,constraint,alternative:/或者|或|任选|任一|\bor\b/i.test(clause),strict:/熟练|精通|独立|丰富|流利|proficient|expert|fluent|advanced/i.test(clause)});
      }
    }
    return result;
  }
  function match(jd,sections){
    const sources=sections.flatMap((m,index)=>{
      if(m.title==='基本信息')return [];
      return String(m.content||'').split(/\n|[。；;]/).map(quote=>quote.trim()).filter(Boolean).map(quote=>({module:index,type:m.title,quote,hasAction:action.test(quote)&&!['技能与证书','个人优势','教育背景'].includes(m.title),uncertain:uncertainty.test(quote),proposed:intended.test(quote)}));
    });
    return parse(jd).map(req=>{
      const matches=req.concepts.map(name=>{const re=concepts.find(x=>x[0]===name)[1];const candidates=sources.filter(s=>re.test(s.quote)&&!s.uncertain).sort((a,b)=>Number(b.hasAction&&!b.proposed)-Number(a.hasAction&&!a.proposed));return {name,source:candidates[0]};});
      const available=matches.filter(x=>x.source),missing=matches.filter(x=>!x.source).map(x=>x.name);
      const all=req.alternative?available.length>0:matches.length>0&&missing.length===0;
      const strong=req.alternative?available.some(x=>x.source.hasAction&&!x.source.proposed):all&&available.every(x=>x.source.hasAction&&!x.source.proposed);
      let status=!req.concepts.length||req.constraint?'review':!available.length?'missing':all&&strong&&!req.strict?'evidence':'related';
      if(req.priority==='非强制')status='review';
      const evidence=[...new Map(available.map(x=>[x.source.module+':'+x.source.quote,x.source])).values()].slice(0,4);
      const reason=status==='review'?'需要人工核对学历、年限、到岗条件或未覆盖的要求；不自动判定满足。':status==='missing'?'未检索到对应证据，不等于你不具备该能力。':status==='evidence'?'找到了相关动作描述；范围、熟练程度和结果仍需本人核实。':missing.length&&!req.alternative?'该条包含多个要求，仍缺少：'+missing.join('、')+'。':req.strict?'发现相关表述，但不能据此确认熟练程度、独立完成能力或经验深度。':'目前只有技能自述、相关表述或计划方案，未确认已执行的证据。';
      const question=req.constraint?'请逐项核对这条原文中的学历、年限或出勤条件；不要用不相关经历代替。':missing.length?'你是否实际使用或做过“'+missing.join('、')+'”？如果有，请补充任务、方法和可核实结果；没有则保留缺口。':'这段经历中你具体负责什么？是已完成、仅提出方案，还是仍在规划？能提供什么结果或作品？';
      return {...req,status,evidence,missing,reason,question};
    });
  }
  root.JDMatch={parse,match};if(typeof module!=='undefined')module.exports=root.JDMatch;
})(typeof window!=='undefined'?window:globalThis);
