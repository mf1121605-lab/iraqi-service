import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { COLORS, FONTS, RADIUS } from '@/constants/theme';

interface Props {
  variant: 'about' | 'privacy' | null;
  onClose: () => void;
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <View style={s.bulletRow}>
      <Text style={s.bulletDot}>•</Text>
      <Text style={s.bulletText}>{children}</Text>
    </View>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <Text style={s.sectionTitle}>{children}</Text>;
}

// Mirrors src/pages/index.js's about/privacy modal content, same order,
// same wording — the founder asked for the mobile version to match the
// website exactly rather than write new copy.
function AboutContent() {
  return (
    <View style={s.body}>
      <Text style={s.paragraph}>
        مرحباً بكم في <Text style={s.strong}>المنصة العراقية للخدمات</Text>، بوابتكم الرقمية الموثوقة لتسهيل وأتمتة المعاملات والخدمات الإلكترونية والأكاديمية في العراق.
      </Text>

      <SectionTitle>رؤيتنا</SectionTitle>
      <Text style={s.paragraph}>
        نسعى إلى إعادة تعريف مفهوم تقديم الخدمات في العراق من خلال التحول الرقمي الشامل، واختصار الوقت والجهد على المواطنين عبر تقديم حلول ذكية وآمنة تضمن إنجاز المعاملات بمرونة عالية ودون الحاجة للتنقل والمراجعات التقليدية.
      </Text>

      <SectionTitle>رسالتنا</SectionTitle>
      <Text style={s.paragraph}>
        تقديم بيئة رقمية سهلة الاستخدام تعتمد على أحدث التقنيات البرمجية وأعلى معايير الأمان، لربط المواطن بالخدمات الإدارية، الأكاديمية، والخدمية بسرعة وشفافية متكاملة.
      </Text>

      <SectionTitle>ماذا نقدم؟</SectionTitle>
      <Bullet><Text style={s.strong}>إنجاز المعاملات والخدمات:</Text> متابعة وتسهيل إجراءات التقديم والخدمات الإلكترونية المختلفة.</Bullet>
      <Bullet><Text style={s.strong}>إدارة الوثائق والمستمسكات:</Text> رفع وتدقيق المستندات الرسمية وإدارتها ببيئة مشفرة.</Bullet>
      <Bullet><Text style={s.strong}>الدفع الإلكتروني الآمن:</Text> دعم وسائل الدفع المحلية المعتمدة (زين كاش، كي كارد).</Bullet>
      <Bullet><Text style={s.strong}>التتبع المباشر:</Text> نظام تتبع ذكي يتيح للمستخدم معرفة حالة معاملته خطوة بخطوة.</Bullet>

      <SectionTitle>قيمنا الجوهرية</SectionTitle>
      <Bullet><Text style={s.strong}>الأمان والسرية:</Text> حماية بيانات ومستمسكات المستخدمين بأعلى تقنيات التشفير.</Bullet>
      <Bullet><Text style={s.strong}>السرعة والإتقان:</Text> المتابعة الدقيقة لضمان إنجاز الطلبات في أسرع وقت ممكن.</Bullet>
      <Bullet><Text style={s.strong}>الشفافية:</Text> وضوح كامل في الرسوم والخطوات وحالة الخدمة.</Bullet>
    </View>
  );
}

function PrivacyContent() {
  return (
    <View style={s.body}>
      <Text style={s.paragraph}>
        تولي <Text style={s.strong}>المنصة العراقية للخدمات</Text> أهمية بالغة لخصوصية مستخدميها وحماية بياناتهم الشخصية.
      </Text>

      <SectionTitle>1. البيانات التي نجمعها</SectionTitle>
      <Bullet><Text style={s.strong}>البيانات الشخصية:</Text> الاسم الكامل، رقم الهاتف، عنوان البريد الإلكتروني، ومحل السكن.</Bullet>
      <Bullet><Text style={s.strong}>الوثائق الرسمية:</Text> صور البطاقة الموحدة، جواز السفر، أو المستندات الأكاديمية.</Bullet>
      <Bullet><Text style={s.strong}>معلومات الدفع:</Text> بيانات إشعارات التسديد (دون تخزين أرقام البطاقات الحساسة).</Bullet>

      <SectionTitle>2. كيفية استخدام البيانات</SectionTitle>
      <Bullet>تنفيذ وتجهيز المعاملات والخدمات التي يطلبها المستخدم.</Bullet>
      <Bullet>التحقق من صحة المستندات المرفوعة لضمان مطابقتها للشروط.</Bullet>
      <Bullet>إرسال إشعارات وتحديثات حول حالة الطلب.</Bullet>

      <SectionTitle>3. حماية وتشفير البيانات</SectionTitle>
      <Text style={s.paragraph}>نلتزم بتطبيق أحدث معايير الأمان السيبراني ونظم التشفير (SSL/TLS) لحماية بياناتك. تتم معالجة الملفات داخل قواعد بيانات سحابية مشفرة ومؤمنة.</Text>

      <SectionTitle>4. مشاركة البيانات</SectionTitle>
      <Text style={s.paragraph}>لا نقوم ببيع أو إيجار أو مشاركة بياناتك الشخصية مع أي جهات تجارية أو إعلانية.</Text>

      <SectionTitle>5. حقوق المستخدم</SectionTitle>
      <Bullet>طلب الاطلاع على بياناتك الشخصية.</Bullet>
      <Bullet>طلب تصحيح أي بيانات غير دقيقة.</Bullet>
      <Bullet>طلب حذف المستمسكات بعد اكتمال الخدمة.</Bullet>

      <SectionTitle>6. التحديثات</SectionTitle>
      <Text style={s.paragraph}>قد نقوم بتحديث سياسة الخصوصية من وقت لآخر. سيتم نشر أي تغييرات على هذه الصفحة مع تحديث تاريخ التعديل.</Text>
    </View>
  );
}

export function AboutPrivacyModal({ variant, onClose }: Props) {
  return (
    <Modal visible={!!variant} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={s.overlay} onPress={onClose}>
        <Pressable style={s.card} onPress={(e) => e.stopPropagation()}>
          <View style={s.header}>
            <Text style={s.title}>{variant === 'about' ? 'من نحن' : 'سياسة الخصوصية'}</Text>
            <Pressable onPress={onClose} hitSlop={10} style={s.closeBtn}>
              <Text style={s.closeIcon}>✕</Text>
            </Pressable>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
            {variant === 'about' ? <AboutContent /> : <PrivacyContent />}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  card: {
    maxHeight: '85%',
    backgroundColor: '#0d1117',
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: 'rgba(230,171,44,0.25)',
    padding: 18,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  title: { fontFamily: FONTS.bold, fontSize: 18, color: COLORS.gold },
  closeBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
  closeIcon: { color: COLORS.white70, fontSize: 14 },
  scroll: { paddingBottom: 8 },
  body: { gap: 8 },
  sectionTitle: { fontFamily: FONTS.bold, fontSize: 14, color: '#fcd34d', marginTop: 6, textAlign: 'right' },
  paragraph: { fontFamily: FONTS.regular, fontSize: 13, color: COLORS.white70, lineHeight: 21, textAlign: 'right' },
  strong: { fontFamily: FONTS.bold, color: COLORS.white },
  bulletRow: { flexDirection: 'row-reverse', gap: 6, alignItems: 'flex-start' },
  bulletDot: { color: COLORS.gold, fontSize: 13, marginTop: 2 },
  bulletText: { flex: 1, fontFamily: FONTS.regular, fontSize: 13, color: COLORS.white70, lineHeight: 21, textAlign: 'right' },
});
