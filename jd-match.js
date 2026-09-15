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
  function guide(clause){
    const entries=[
      [/记忆|memory/i,'记忆系统','让产品在后续交互中利用用户允许保存的信息，而不只是保存聊天记录。','你保存了哪些信息？何时更新或删除？记错后如何纠正？哪些部分已实现？','课程助手保存经确认的学习目标，用户可以查看和删除。只有实际设计或实现过，才能写入。'],
      [/搜索|溯源|引用|好答案|答案质量|评测/,'搜索与答案质量','让回答找到相关资料，并能核查来源、判断是否解决了问题。','你如何选资料、关联出处？有没有好坏答案样例？如何发现错误并修正？','对同一组问题检查回答是否准确、引用是否支持结论。未做过评测，不要写成已建立评测体系。'],
      [/Agent|智能体|任务规划/i,'Agent 任务设计','把用户目标拆成步骤，明确需要什么信息、何时调用工具以及怎样判断任务完成。','具体服务哪个用户任务？你设计了哪些步骤？失败时怎么办？有原型还是只有方案？','把出游需求拆成收集预算、比较路线、确认方案；这是说明任务拆解的示例，不是你的经历。'],
      [/语音|截图|实拍|多模态|多样表达/,'多种输入方式','让用户通过图片、语音等表达需求，并考虑识别不准时的确认与纠错。','你做过哪种输入？输入后发生什么？识别错误时用户如何修改？','图片识别后先让用户确认关键信息，再进入下一步。仅使用过图片生成工具不等于做过这类产品。'],
      [/调研|访谈|问卷|用户研究|社区|内容/,'用户与社区研究','从真实行为、内容或反馈中发现问题，并说明发现如何影响设计。','你研究了谁、什么场景？材料从哪里来？有哪些发现？哪些是观察、推测或已经验证的结论？','可回想社团活动、课程问卷或账号运营。写清实际回收数、分析方法及你的职责，不把投放数当作有效回收数。'],
      [/A\s*\/\s*B|实验|转化|增长/i,'实验与效果验证','用可比较的方案和指标验证假设，区分实验设计与已执行实验。','你提出什么假设？比较哪些方案？是否真的执行？指标、样本和结果是什么？','如果只设计过实验，可以写“设计验证方案”，不能写成“通过实验提升转化”。'],
      [/SQL|Python|Excel|工具|熟练|精通/i,'工具与熟练程度','关键是你用工具完成了什么具体任务，而不是简历里出现工具名称。','处理了什么问题？用了哪些操作？哪里由你独立完成？是否有可核实产出？','课程作业中实际使用工具处理数据也可作为材料，但应注明课程场景与能力边界。'],
      [/学历|本科|硕士|博士|年|到岗|每周|个月/,'资格与时间条件','这是需要直接核实的条件，不能用其他优点或项目经历替代。','你的实际学历、毕业时间或可出勤时间是什么？原文是否明确要求？','不知道到岗时间可以暂时留空；不符合的条件应保留为缺口。']
    ];
    const found=entries.filter(([re])=>re.test(clause));
    return (found.length?found:[[null,'先把要求变成具体问题','这条要求尚不能由本地规则准确解释，需要结合岗位场景核对，不自动推断满足。','工作中会遇到什么问题？你做过类似任务吗？你负责什么、如何处理、有什么产出？','先记录一段真实课程、工作或生活项目，再确认它是否相关；不要为了匹配编造经历。']]).map(([,title,meaning,questions,example])=>({title,meaning,questions,example}));
  }
  root.JDMatch={parse,match,guide};if(typeof module!=='undefined')module.exports=root.JDMatch;
})(typeof window!=='undefined'?window:globalThis);
