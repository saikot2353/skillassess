import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import {
  Sparkles,
  Send,
  Bot,
  User,
  HelpCircle,
  Lightbulb,
  RotateCcw,
  CheckCircle2,
  ShieldCheck,
  Wrench,
  AlertTriangle
} from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

export const AssessorAIHelp: React.FC = () => {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const isRTL = language === 'ar';

  const [inputQuery, setInputQuery] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-1',
      sender: 'assistant',
      text: isRTL
        ? `مرحباً بك يا ${user?.name || 'مقيمنا المعتمد'}. أنا مساعد الذكاء الاصطناعي الخاص بنظام SkillAssess 360 (مدعوم بنموذج Gemini 2.5). يمكنك سؤالي عن معايير تصحيح المهام العملية، إجراءات مخالفات السلامة، قواعد التقييم المعياري، أو بروتوكولات التحقق من المرشحين.`
        : `Hello ${user?.name || 'Assessor'}. I am your SkillAssess 360 AI Assessment Copilot (powered by Gemini 2.5). You can ask me about rubric grading thresholds, workshop safety violation protocols, equipment tolerances, or candidate verification rules.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  const quickPrompts = [
    {
      en: 'What are the grading criteria for welding pipe joints?',
      ar: 'ما هي معايير تصحيح وصلات لحام الأنابيب SMAW؟'
    },
    {
      en: 'How to handle an immediate safety violation during practical exam?',
      ar: 'كيف أتعامل مع مخالفة سلامة جسيمة أثناء الاختبار العملي؟'
    },
    {
      en: 'What is the procedure if a candidate passport photo does not match?',
      ar: 'ما هو الإجراء المعتمد في حال عدم تطابق صورة الجواز مع المرشح؟'
    },
    {
      en: 'What is the standard insulation resistance threshold for 3-phase DBs?',
      ar: 'ما هو الحد الأدنى لمقاومة العزل في لوحات التوزيع ثلاثية الأطوار؟'
    }
  ];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const generateAIResponse = (query: string): string => {
    const q = query.toLowerCase();

    if (q.includes('welding') || q.includes('لحام')) {
      return isRTL
        ? `### معايير تقييم وصلات اللحام (SMAW / TIG):\n\n1. **عمق التغلغل والانصهار (Penetration)**: يجب تحقيق تغلغل كامل دون وجود شوائب خبث (Slag inclusions).\n2. **شكل خط اللحام (Bead Appearance)**: تجانس العرض والارتفاع وعدم وجود حفر جانبي (Undercut > 0.5mm يعتبر خصماً للدرجة).\n3. **المسامية والعيوب الظاهرة**: خلو السطح من المسامية (Porosity) والشقوق الدقيقة.\n4. **السلامة الشخصية**: ارتداء قناع الحماية التلقائي، مريول الجلد والقفازات طوال فترة القوس الكهربائي.`
        : `### Welding Practical Assessment Standards (SMAW / TIG):\n\n1. **Root Penetration & Fusion**: Full penetration must be achieved along the joint line without slag entrapment or incomplete fusion.\n2. **Bead Uniformity & Profile**: Regular crown with consistent width; undercut exceeding 0.5mm results in a deduction.\n3. **Porosity & Defect Tolerance**: Zero surface cracks permitted. Gas pores must not exceed 1mm diameter.\n4. **Safety Compliance**: Auto-darkening welding hood (shade 10-12), leather gauntlets, and active fume extraction are strictly non-negotiable.`;
    }

    if (q.includes('safety') || q.includes('سلامة') || q.includes('مخالفة')) {
      return isRTL
        ? `### بروتوكول مخالفات السلامة الميدانية:\n\n1. **إيقاف فوري للعمل**: في حال ارتكاب المرشح لمخالفة خطرة (كعدم عزل الطاقة الكهربائية LOTO أو عدم ارتداء نظارة الحماية أثناء التجليخ)، قم فوراً بإيقاف الاختبار.\n2. **توثيق الدليل**: التقط صورة لموقع المخالفة ضمن تبويب الأدلة بصفتها "SAFETY_CHECK".\n3. **رصد الدرجة**: رصد درجة صفر (0/5) في معيار السلامة المعني.\n4. **إبلاغ مدير المركز**: إذا كانت المخالفة تعرض الأرواح للخطر، يتم إلغاء الاختبار بالكامل وإبلاغ مدير المركز عبر النظام.`
        : `### Protocol for Immediate Workshop Safety Violations:\n\n1. **Immediate Cease-Work Order**: If the candidate commits a Class-A violation (e.g. working live without LOTO or angle-grinding without eye/face shield), immediately halt the practical task.\n2. **Evidence Logging**: Capture a photographic record of the unsafe condition under the Evidence tab categorized as \`SAFETY_CHECK\`.\n3. **Rubric Rating**: Award 0/5 in Section 2 (Safety & PPE Compliance) for that specific criterion.\n4. **Center Admin Escalation**: If the breach poses an imminent hazard to personnel, terminate the assessment session and notify Center Admin via the Incident protocol.`;
    }

    if (q.includes('passport') || q.includes('جواز') || q.includes('هوية') || q.includes('photo')) {
      return isRTL
        ? `### بروتوكول عدم تطابق الهوية أو جواز السفر:\n\n1. **عدم إدخال المرشح إلى الورشة**: لا تسمح للمرشح بدخول محطة العمل إطلاقاً.\n2. **التدقيق الثنائي**: اطلب من منسق المركز (Support Staff) مطابقة بطاقة التسجيل الورقية وبصمة الحضور.\n3. **تصعيد فوري لمدير المركز**: توجيه المرشح لمكتب مدير المركز لإعادة المطابقة عبر بوابة APRO المركزية.\n4. **توثيق الحالة**: تسجيل حالة "عدم تطابق الهوية" في سجل التدقيق الميداني.`
        : `### Candidate Identity / Passport Discrepancy Protocol:\n\n1. **Withhold Workshop Access**: Never admit a candidate to the assessment bay if physical passport or biometric features do not align with system records.\n2. **Secondary Physical Verification**: Request the intake officer to cross-reference physical registration paperwork and enrollment token.\n3. **Escalate to Center Admin**: Escort candidate to the Center Administration Office for manual APRO credential re-verification.\n4. **Audit Flag**: Log a verification discrepancy note in the verification console.`;
    }

    return isRTL
      ? `### توجيه المقيم المعتمد:\n\nبناءً على معايير الجودة لبرنامج تقييم المهارات 360:\n\n- يجب رصد الدرجات بعد الانتهاء التام من فحص المنتج العملي وقياس الأبعاد الهندسية.\n- يُشترط رفع صورة واضحة لنموذج التقييم الورقي الموقع من المرشح والمقيم قبل القفل النهائي.\n- فور قفل التقييم (Confirm & Lock)، يصبح السجل معتمداً في السلسلة الرسمية ولا يمكن تعديله.`
      : `### Certified Assessor Advisory:\n\nUnder SkillAssess 360 Quality Assurance Framework:\n\n- All ratings must be substantiated through objective workpiece measurement and rubric benchmarks.\n- Uploading the physical co-signed evaluation sheet is mandatory prior to permanent sealing.\n- Once you click "Confirm & Lock", the score is cryptographically committed to the central ledger and becomes strictly immutable.`;
  };

  const handleSendMessage = (textToSend?: string) => {
    const query = textToSend || inputQuery;
    if (!query.trim()) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text: query.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputQuery('');
    setIsTyping(true);

    setTimeout(() => {
      const replyText = generateAIResponse(query);
      const aiMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        sender: 'assistant',
        text: replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, aiMsg]);
      setIsTyping(false);
    }, 700);
  };

  return (
    <div className="space-y-6 pb-12 max-w-4xl mx-auto flex flex-col h-[calc(100vh-140px)]">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 text-white flex items-center justify-center shadow-md">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-[#3F3030]">
                {isRTL ? 'المساعد الذكي للمقيم' : 'Assessor AI Assistant'}
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-100 text-amber-800 border border-amber-200">
                Gemini 2.5
              </span>
            </div>
            <p className="text-xs text-gray-500">
              {isRTL ? 'استشارات فورية حول معايير التقييم وإجراءات السلامة' : 'Real-time guidance on rubric standards, safety protocols, and technical tolerance'}
            </p>
          </div>
        </div>

        <button
          onClick={() => setMessages([messages[0]])}
          className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs transition-colors"
          title={isRTL ? 'مسح المحادثة' : 'Reset Chat'}
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Suggested Quick Prompt Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 flex-shrink-0 no-scrollbar">
        {quickPrompts.map((prompt, idx) => (
          <button
            key={idx}
            onClick={() => handleSendMessage(isRTL ? prompt.ar : prompt.en)}
            className="px-3 py-1.5 rounded-full bg-[#F8ECEE] hover:bg-[#F8ECEE]/80 border border-[#E8D9D2] text-[11px] font-semibold text-[#7A2E3A] whitespace-nowrap transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <Lightbulb className="w-3 h-3 text-[#C9A24D]" />
            <span>{isRTL ? prompt.ar : prompt.en}</span>
          </button>
        ))}
      </div>

      {/* Chat Messages Stream */}
      <div className="flex-1 bg-white rounded-2xl border border-[#E8D9D2] p-5 shadow-sm overflow-y-auto space-y-4">
        {messages.map(msg => (
          <div
            key={msg.id}
            className={`flex items-start gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.sender === 'assistant' && (
              <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center flex-shrink-0 shadow-sm mt-0.5">
                <Bot className="w-4 h-4" />
              </div>
            )}

            <div
              className={`max-w-[80%] rounded-2xl p-4 text-xs leading-relaxed ${
                msg.sender === 'user'
                  ? 'bg-[#7A2E3A] text-white shadow-md'
                  : 'bg-gray-50 border border-gray-200 text-gray-800 shadow-sm'
              }`}
            >
              <div className="whitespace-pre-wrap font-sans">
                {msg.text}
              </div>
              <div
                className={`text-[10px] mt-2 text-right ${
                  msg.sender === 'user' ? 'text-white/70' : 'text-gray-400'
                }`}
              >
                {msg.timestamp}
              </div>
            </div>

            {msg.sender === 'user' && (
              <div className="w-8 h-8 rounded-xl bg-gray-800 text-white flex items-center justify-center flex-shrink-0 shadow-sm mt-0.5">
                <User className="w-4 h-4" />
              </div>
            )}
          </div>
        ))}

        {isTyping && (
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 text-xs text-gray-500 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-bounce" style={{ animationDelay: '300ms' }} />
              <span className="ml-2 font-mono text-[11px]">{isRTL ? 'جارٍ صياغة الإجابة الفنية...' : 'Gemini is formulating technical advisory...'}</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <div className="flex-shrink-0 bg-white rounded-2xl p-3 border border-[#E8D9D2] shadow-sm flex items-center gap-2">
        <input
          type="text"
          value={inputQuery}
          onChange={e => setInputQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
          placeholder={isRTL ? 'اسأل المساعد الذكي عن معايير التقييم أو إجراءات السلامة...' : 'Ask AI Assistant about rubric standards or safety rules...'}
          className="flex-1 text-xs border-0 focus:outline-none px-3 py-2 bg-transparent text-gray-900"
        />
        <button
          type="button"
          onClick={() => handleSendMessage()}
          disabled={!inputQuery.trim() || isTyping}
          className="px-4 py-2.5 rounded-xl bg-[#7A2E3A] hover:bg-[#5C1D24] disabled:opacity-50 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
        >
          <Send className="w-3.5 h-3.5" />
          <span>{isRTL ? 'إرسال' : 'Send'}</span>
        </button>
      </div>
    </div>
  );
};
