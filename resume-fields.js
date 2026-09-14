(function(root){
  const schemas={
    '基本信息':[['name','姓名'],['phone','手机'],['email','邮箱'],['city','所在城市'],['target','求职方向'],['link','个人主页 / 作品集']],
    '教育背景':[['school','学校'],['degree','学历'],['major','专业'],['period','起止时间'],['gpa','GPA / 成绩']],
    '工作经历':[['company','公司 / 组织'],['role','职位'],['period','起止时间'],['city','工作地点']],
    '项目经历':[['project','项目名称'],['role','担任角色'],['period','起止时间'],['link','项目链接']],
    '技能与证书':[['skills','专业技能'],['languages','语言能力'],['certificates','证书 / 奖项']],
    'AI 实践':[['project','实践名称'],['role','担任角色'],['period','起止时间']],
    '校园经历':[['company','学校 / 社团 / 组织'],['role','职务'],['period','起止时间']],
    '个人优势':[], '其他经历':[]
  };
  const aliases={name:'姓名|名字',phone:'联系电话|联系方式|手机号码|手机号|手机|电话',email:'电子邮箱|邮箱|Email|E-mail',city:'所在城市|居住地|所在地|工作地点|城市',target:'求职意向|求职方向|目标岗位|意向岗位',link:'个人主页|作品集|项目链接|网站|GitHub|LinkedIn',school:'毕业院校|毕业学校|学校名称|学校|院校',degree:'最高学历|学历|学位',major:'所学专业|专业名称|专业',period:'起止时间|就读时间|在职时间|项目时间|时间',gpa:'GPA|绩点|成绩',company:'公司名称|公司|组织|单位',role:'担任角色|担任职位|职位|岗位|角色|职务',project:'项目名称|项目',skills:'专业技能|技术栈|技能',languages:'语言能力|外语水平|语言',certificates:'资格证书|证书|获奖|奖项'};
  schemas['基本信息'].push(['wechat','微信']);
  schemas['教育背景'].push(['courses','核心课程']);
  aliases.wechat='微信号|微信|WeChat';aliases.courses='核心课程|主修课程|课程';
  aliases.skills='工具技能|'+aliases.skills;aliases.certificates='证书语言|荣誉奖项|'+aliases.certificates;
  const dateRange=/(?:19|20)\d{2}(?:\s*[.\/年-]\s*\d{1,2}月?)?\s*(?:—|–|~|～|至|-|to)\s*(?:(?:19|20)\d{2}(?:\s*[.\/年-]\s*\d{1,2}月?)?|至今|现在|Present)/i;
  function pdfText(items){
    const rows=[];
    for(const item of items.filter(x=>x.str?.trim()&&x.transform).sort((a,b)=>b.transform[5]-a.transform[5]||a.transform[4]-b.transform[4])){
      const y=item.transform[5];let row=rows.find(r=>Math.abs(r.y-y)<2);
      if(!row){row={y,items:[]};rows.push(row);}row.items.push(item);
    }
    return rows.map(row=>{let line='',prev=null;for(const x of row.items.sort((a,b)=>a.transform[4]-b.transform[4])){
      const gap=prev?x.transform[4]-(prev.transform[4]+prev.width):0;
      line+=(!prev?'':gap>24?'\t':gap>2?' ':'')+x.str;prev=x;
    }return line.trim();}).join('\n');
  }
  function parse(type,content){
    const defs=schemas[type]||[],fields=Object.fromEntries(defs.map(([k])=>[k,''])),sources={},spans=[];
    const text=String(content||'');
    const put=(key,value,start,end,method)=>{if(!(key in fields)||fields[key]||!value.trim())return;fields[key]=value.trim();sources[key]={text:text.slice(start,end),method};spans.push([start,end]);};
    const allNames=Object.values(aliases).join('|');
    for(const [key] of defs){
      const re=new RegExp('(?:^|[\\n｜|;；,，\\s])(?:'+aliases[key]+')\\s*[:：]\\s*(.*?)(?=\\s+(?:'+allNames+')\\s*[:：]|[\\n｜|;；]|$)','gim');
      const m=re.exec(text);if(m)put(key,m[1],m.index,m.index+m[0].length,'明确标签');
    }
    const locate=(key,re)=>{const m=re.exec(text);if(m)put(key,m[0],m.index,m.index+m[0].length,'格式识别');};
    locate('email',/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/);
    locate('phone',/(?:\+?86[ -]?)?1[3-9]\d{9}|(?:\+?852[ -]?)?[569]\d{3}[ -]?\d{4}/);
    locate('link',/https?:\/\/[^\s｜|，,；;]+/i);
    locate('period',/(?:19|20)\d{2}(?:[.\/年-]\d{1,2}月?)?\s*(?:—|–|~|～|至|-|to)\s*(?:(?:19|20)\d{2}(?:[.\/年-]\d{1,2}月?)?|至今|现在|Present)/i);
    locate('degree',/博士|硕士|本科|学士|大专|专科|Bachelor(?:'s)?|Master(?:'s)?|PhD/i);
    locate('school',/[\u4e00-\u9fa5A-Za-z]{2,24}(?:大学|学院|学校)/);
    locate('company',/[\u4e00-\u9fa5A-Za-z]{2,30}(?:有限公司|集团|公司|事务所)/);
    const first=text.split(/\n/).find(x=>x.trim())||'';
    const take=(key,value)=>{const start=text.indexOf(value);if(start>=0)put(key,value,start,start+value.length,'经历首行，待核对');};
    const cols=first.replace(dateRange,'').replace(/^[\s｜|]+|[\s｜|]+$/g,'').split(/\t+|[｜|]| {2,}/).map(x=>x.trim()).filter(x=>x&&!/^[（）()]+$/.test(x));
    if(['工作经历','校园经历'].includes(type)&&cols.length>=2){take('company',cols[0]);take('role',cols[1]);}
    if(['项目经历','AI 实践'].includes(type)&&cols.length>=2){take('project',cols[0]);take('role',cols[1]);}
    if(type==='教育背景'&&fields.school){const rest=first.slice(first.indexOf(fields.school)+fields.school.length);const major=rest.split(/本科|学士|硕士|博士|\d{4}/)[0].replace(/^[\s｜|]+|[\s｜|（(]+$/g,'');if(major)take('major',major);}
    if(type==='基本信息'){const wx=/(?:微信号?|WeChat)\s*[:：]?\s*([a-zA-Z][\w-]{5,19})/i.exec(text);if(wx)put('wechat',wx[1],wx.index,wx.index+wx[0].length,'微信标签');if(fields.email)fields.email=fields.email.replace(/\s/g,'');}
    if(type==='技能与证书'&&!fields.skills&&!fields.languages&&!fields.certificates&&text.trim())put('skills',text.trim(),0,text.length,'技能模块内容，待核对');
    if(type==='基本信息'){
      const m=/^\s*([\u4e00-\u9fa5]{2,4})(?=\s|[｜|]|$)/.exec(first);
      if(m)put('name',m[1],text.indexOf(first),text.indexOf(first)+m[0].length,'首行候选，待核对');
      const seg=first.split(/[｜|]/).map(x=>x.trim());if(seg.length===2&&seg[1].length<=24)put('target',seg[1],text.indexOf(seg[1]),text.indexOf(seg[1])+seg[1].length,'分隔栏候选，待核对');
    }
    if(type==='工作经历'){
      const seg=first.split(/[｜|]/).map(x=>x.trim());if(seg.length>1&&seg[1].length<=30&&!/\d{4}/.test(seg[1]))put('role',seg[1],text.indexOf(seg[1]),text.indexOf(seg[1])+seg[1].length,'分隔栏候选，待核对');
    }
    if(['项目经历','AI 实践'].includes(type)&&first.length<=100&&!/[。；]/.test(first))take('project',first.replace(dateRange,'').trim());
    let remaining=text.split('');for(const [a,b] of spans)for(let i=a;i<b;i++)if(remaining[i]!=='\n')remaining[i]='';
    const notes=remaining.join('').split('\n').map(x=>x.replace(/^[\s｜|,，;；]+|[\s｜|,，;；]+$/g,'')).filter(Boolean).join('\n');
    return {fields,sources,notes,original:text};
  }
  function serialize(type,data){return [...(schemas[type]||[]).filter(([k])=>data.fields[k]?.trim()).map(([k,l])=>l+'：'+data.fields[k].trim()),data.notes.trim()].filter(Boolean).join('\n');}
  // Recognize facts first; headings are context, never the sole classifier.
  function classify(text){
    const headings=[['基本信息',/^(基本信息|个人信息|联系方式|contact)$/i],['教育背景',/^(教育背景|教育经历|教育信息|education)$/i],['工作经历',/^(工作经历|工作经验|实习经历|实习经验|工作与实习经历|employment|work experience)$/i],['项目经历',/^(项目经历|项目经验|项目实践|projects?)$/i],['技能与证书',/^(技能与证书|专业技能|技能|证书|荣誉奖项|奖项|skills?|certifications?)$/i],['个人优势',/^(个人优势|个人简介|自我评价|summary|profile)$/i]];
    headings.push(['校园经历',/^(校园经历|社团经历|学生工作)$/i],['AI 实践',/^(AI能力与智能体实践|AI实践|智能体实践)$/i]);
    const lines=String(text||'').replace(/\r\n?/g,'\n').split('\n');
    let context='',current=null;const groups=[];
    let experience=null;
    const add=(type,line,reason,newEntry=false)=>{
      if(!current||current.title!==type||newEntry){current={title:type,lines:[],reasons:[]};groups.push(current);}
      current.lines.push(line);current.reasons.push(reason);
    };
    lines.forEach((raw,index)=>{
      let line=raw.trim();if(!line)return;
      const clean=line.replace(/[\s#【】\[\]：:]/g,'');
      const heading=headings.find(([,re])=>re.test(clean));
      if(heading){context=heading[0];current=null;experience=null;return;}
      const colon=line.search(/[:：]/);
      const inline=colon>0&&headings.find(([type,re])=>type!=='技能与证书'&&type!=='基本信息'&&re.test(line.slice(0,colon).trim()));
      if(inline){context=inline[0];current=null;experience=null;line=line.slice(colon+1).trim();if(!line)return;}
      const contact=/(?:姓名|手机|电话|邮箱|求职意向|求职方向|所在城市)\s*[:：]|[\w.+-]+@[\w.-]+\.[a-z]{2,}|(?:\+?86[ -]?)?1[3-9]\d{9}/i.test(line);
      const action=/^[•●·\-*]|^(负责|参与|完成|协助|主导|使用|通过|设计|开发|实现|提升|优化|搭建|维护|组织|led\b|built\b|developed\b)/i.test(line);
      const school=!action&&/^[\u4e00-\u9fa5A-Za-z]{2,24}(大学|学院|学校)(?:\s|[｜|]|$)/i.test(line);
      const company=!action&&/^[\u4e00-\u9fa5A-Za-z]{2,35}(?:有限公司|集团|公司|事务所|法院|检察院)(?:\s|[｜|（(]|$)/i.test(line);
      const project=!action&&(/^(项目名称|项目)\s*[:：]/.test(line)||(/项目/.test(line)&&line.length<65&&!company));
      const skill=/^(工具技能|专业技能|技能|技术栈|语言能力|外语水平|证书语言|荣誉奖项|证书|资格证书|获奖|奖项|skills?|languages?|certifications?)\s*[:：]/i.test(line);
      let type='',reason='',newEntry=false;
      if(contact){type='基本信息';reason='联系方式或明确字段';}
      else if(skill){type='技能与证书';reason='技能 / 证书字段';}
      else if(context&&context!=='基本信息'){
        type=context;reason='明确分区标题';newEntry=/^\d{4}/.test(line)&&dateRange.test(line)||type==='教育背景'&&school||type==='工作经历'&&company&&line.length<100||type==='AI 实践'&&/^AI\s*[^：:。；]+$/.test(line);
        if(current?.title==='技能与证书'&&!newEntry)type='技能与证书';
        else if(experience&&!newEntry)current=experience;
      }
      else if(project){type='项目经历';reason='项目名称候选';newEntry=!!current&&current.title===type;}
      else if(school){type='教育背景';reason='学校实体候选';newEntry=!!current&&current.title===type;}
      else if(company){type='工作经历';reason='组织实体候选';newEntry=!!current&&current.title===type;}
      else if(((groups.length===0&&!context)||context==='基本信息')&&/^[\u4e00-\u9fa5]{2,4}(?:\s*[｜|].*)?$/.test(line)){type='基本信息';reason='姓名候选，待核对';}
      else {type=(experience?experience.title:(current&&current.title!=='基本信息'?current.title:context))||'其他经历';reason=type==='其他经历'?'未确定类别，请手动核对':'沿用相邻经历 / 标题上下文，待核对';if(experience)current=experience;}
      add(type,line,reason,newEntry);
      if(['教育背景','工作经历','项目经历','校园经历','AI 实践'].includes(type))experience=current;
    });
    return groups.map(g=>{const content=g.lines.join('\n');return {title:g.title,content,data:parse(g.title,content),recognition:[...new Set(g.reasons)].join('；')};});
  }
  root.ResumeFields={schemas,parse,serialize,classify,pdfText};
  if(typeof module!=='undefined')module.exports=root.ResumeFields;
})(typeof window!=='undefined'?window:globalThis);
