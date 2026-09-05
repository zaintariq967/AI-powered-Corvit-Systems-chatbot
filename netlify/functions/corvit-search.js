// Live search proxy for the official Corvit website.
// Netlify deploys this as /.netlify/functions/corvit-search
// No search-provider API key is required: it searches a curated set of official Corvit pages.
// This is intentionally constrained to corvit.com so the chatbot remains grounded.

const PAGES = [
  ["Home","https://corvit.com/systems/"],
  ["About","https://corvit.com/systems/about-us/"],
  ["Introduction","https://corvit.com/systems/about-us/introduction/"],
  ["CCNA","https://corvit.com/systems/ccna-training/"],
  ["CCNP","https://corvit.com/systems/ccnp-training/"],
  ["Artificial Intelligence","https://corvit.com/systems/artificial-intelligence-training/"],
  ["Cyber Security","https://corvit.com/systems/cyber-security-training/"],
  ["Ethical Hacking","https://corvit.com/systems/ethical-hacking-training/"],
  ["Cloud Computing","https://corvit.com/systems/cloud-computing-training/"],
  ["DevOps","https://corvit.com/systems/devops-training/"],
  ["Python","https://corvit.com/systems/python-training/"],
  ["More Courses","https://corvit.com/systems/more-courses/"],
  ["Best IT Training","https://corvit.com/systems/best-it-training/"],
  ["Online Training","https://corvit.com/systems/online-it-training-institute/"],
  ["Lahore Schedule","https://corvit.com/systems/lahore-schedule/"],
  ["Lahore Fees","https://corvit.com/systems/lahore-fee/"],
  ["NAVTTC","https://corvit.com/systems/navttc-free-courses-lahore/"],
  ["PSEB","https://corvit.com/systems/pseb-trainings/"],
  ["FAQs","https://corvit.com/systems/faqs/"],
  ["Contact","https://corvit.com/systems/contact-us/"],
  ["Management","https://corvit.com/systems/our-team/management-team/"]
];

function stripHtml(html){
  return html
    .replace(/<script[\s\S]*?<\/script>/gi," ")
    .replace(/<style[\s\S]*?<\/style>/gi," ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi," ")
    .replace(/<[^>]+>/g," ")
    .replace(/&nbsp;/gi," ")
    .replace(/&amp;/gi,"&")
    .replace(/\s+/g," ")
    .trim();
}
function tokens(q){
  return String(q).toLowerCase().replace(/[^\w\s-]/g," ").split(/\s+/).filter(x=>x.length>2);
}

export default async (req) => {
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") || "").trim();
  if(!q) return new Response(JSON.stringify({results:[]}),{headers:{"content-type":"application/json"}});

  const terms = tokens(q);
  const results = [];

  await Promise.all(PAGES.map(async ([title,page])=>{
    try{
      const r=await fetch(page,{headers:{"user-agent":"CorvitStudentAssistant/1.0"}});
      if(!r.ok) return;
      const html=await r.text();
      const text=stripHtml(html);
      const lower=text.toLowerCase();
      let score=0;
      for(const t of terms){
        const count=(lower.match(new RegExp(t.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"),"g"))||[]).length;
        score += Math.min(count,6);
      }
      if(score>0){
        results.push({
          title,
          url:page,
          score,
          text:text.slice(0,1800)
        });
      }
    }catch(_){}
  }));

  results.sort((a,b)=>b.score-a.score);
  return new Response(JSON.stringify({results:results.slice(0,5)}),{
    status:200,
    headers:{"content-type":"application/json","cache-control":"public, max-age=120"}
  });
};
