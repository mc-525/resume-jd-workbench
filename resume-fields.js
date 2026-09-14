(function(root){
  const schemas={
    '基本信息':[['name','姓名'],['phone','手机'],['email','邮箱'],['city','所在城市'],['target','求职方向'],['link','个人主页 / 作品集']],
    '教育背景':[['school','学校'],['degree','学历'],['major','专业'],['period','起止时间'],['gpa','GPA / 成绩']],
    '工作经历':[['company','公司 / 组织'],['role','职位'],['period','起止时间'],['city','工作地点']],
    '项目经历':[['project','项目名称'],['role','担任角色'],['period','起止时间'],['link','项目链接']],
    '技能与证书':[['skills','专业技能'],['languages','语言能力'],['certificates','证书 / 奖项']],
    '个人优势':[], '其他经历':[]
  };
  const aliases={name:'姓名|名字',phone:'联系电话|联系方式|手机号码|手机号|手机|电话',email:'电子邮箱|邮箱|Email|E-mail',city:'所在城市|居住地|所在地|工作地点|城市',target:'求职意向|求职方向|目标岗位|意向岗位',link:'个人主页|作品集|项目链接|网站|GitHub|LinkedIn',school:'毕业院校|毕业学校|学校名称|学校|院校',degree:'最高学历|学历|学位',major:'所学专业|专业名称|专业',period:'起止时间|就读时间|在职时间|项目时间|时间',gpa:'GPA|绩点|成绩',company:'公司名称|公司|组织|单位',role:'担任角色|担任职位|职位|岗位|角色|职务',project:'项目名称|项目',skills:'专业技能|技术栈|技能',languages:'语言能力|外语水平|语言',certificates:'资格证书|证书|获奖|奖项'};
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
    if(type==='技能与证书'&&!fields.skills&&!fields.languages&&!fields.certificates&&text.trim())put('skills',text.trim(),0,text.length,'技能模块内容，待核对');
    if(type==='基本信息'){
      const m=/^\s*([\u4e00-\u9fa5]{2,4})(?=\s|[｜|]|$)/.exec(first);
      if(m)put('name',m[1],text.indexOf(first),text.indexOf(first)+m[0].length,'首行候选，待核对');
      const seg=first.split(/[｜|]/).map(x=>x.trim());if(seg.length===2&&seg[1].length<=24)put('target',seg[1],text.indexOf(seg[1]),text.indexOf(seg[1])+seg[1].length,'分隔栏候选，待核对');
    }
    if(type==='工作经历'){
      const seg=first.split(/[｜|]/).map(x=>x.trim());if(seg.length>1&&seg[1].length<=30&&!/\d{4}/.test(seg[1]))put('role',seg[1],text.indexOf(seg[1]),text.indexOf(seg[1])+seg[1].length,'分隔栏候选，待核对');
    }
    if(type==='项目经历'&&first.length<=45&&!/[。；]/.test(first))put('project',first.trim(),text.indexOf(first),text.indexOf(first)+first.length,'首行候选，待核对');
    let remaining=text.split('');for(const [a,b] of spans)for(let i=a;i<b;i++)if(remaining[i]!=='\n')remaining[i]='';
    const notes=remaining.join('').split('\n').map(x=>x.replace(/^[\s｜|,，;；]+|[\s｜|,，;；]+$/g,'')).filter(Boolean).join('\n');
    return {fields,sources,notes,original:text};
  }
  function serialize(type,data){return [...(schemas[type]||[]).filter(([k])=>data.fields[k]?.trim()).map(([k,l])=>l+'：'+data.fields[k].trim()),data.notes.trim()].filter(Boolean).join('\n');}
  root.ResumeFields={schemas,parse,serialize};
  if(typeof module!=='undefined')module.exports=root.ResumeFields;
})(typeof window!=='undefined'?window:globalThis);
