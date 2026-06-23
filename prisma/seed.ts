import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const BRANCHES = ["종로", "송도"];
const CENTERS = ["피부", "헤어스파", "롱레스트", "풋케어", "도수"];
const DEPARTMENTS_BY_CENTER: Record<string, string[]> = {
  피부: ["피부코디", "피부관리", "피부간호"],
};

const ITEM_POOL = [
  "멸균거즈",
  "일회용 타올",
  "마스크팩",
  "면봉",
  "소독용 솜",
  "고무장갑",
  "타이머",
  "라벨프린터 테이프",
  "사무용 펜",
  "복사용지",
  "핸드크림",
  "디퓨저 리필",
  "수건",
  "물티슈",
  "소독제",
  "마스크",
  "보관용 용기",
  "전기포트",
  "공기청정기 필터",
  "충전케이블",
];

const OPTIONS = ["", "", "색상: 화이트", "사이즈: L", "용량: 500ml", "1box(50입)", "민감성 피부용"];

const STATUSES = ["PENDING", "ORDERED", "HOLD", "CLOSED", "RETURNED"];
const STATUS_WEIGHTS = [0.25, 0.2, 0.15, 0.3, 0.1]; // 합 1.0

const HOLD_COMMENTS = [
  "재고 확인 중입니다.",
  "동일 품목 중복 신청 확인 필요",
  "예산 초과로 보류, 차월 진행 검토",
  "옵션 재확인 후 처리 예정",
];

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
  return arr[randomInt(0, arr.length - 1)];
}

function weightedStatus() {
  const r = Math.random();
  let acc = 0;
  for (let i = 0; i < STATUSES.length; i++) {
    acc += STATUS_WEIGHTS[i];
    if (r <= acc) return STATUSES[i];
  }
  return STATUSES[STATUSES.length - 1];
}

function pastDate(maxDaysAgo: number) {
  const daysAgo = randomInt(0, maxDaysAgo);
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d;
}

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

const VENDOR_LINKS = [
  "https://www.coupang.com/vp/products/0000000000",
  "https://item.gmarket.co.kr/Item?goodsCode=0000000000",
  "https://smartstore.naver.com/example/products/0000000000",
  "https://www.example-shop.com/products/0000000000",
];

async function seedDemoOrders(departmentId: string, requesterId: string, label: string, snackEnabled: boolean) {
  const existing = await prisma.order.count({ where: { departmentId } });
  if (existing > 0) return; // 이미 데모 데이터가 있으면 중복 생성하지 않음

  for (let i = 0; i < 10; i++) {
    const status = weightedStatus();
    const price = randomInt(2, 80) * 1000;
    const quantity = randomInt(1, 8);
    const isSnack = snackEnabled && Math.random() < 0.25;

    await prisma.order.create({
      data: {
        itemName: `${pick(ITEM_POOL)} (${label} 데모)`,
        quantity,
        option: pick(OPTIONS) || null,
        price,
        purchaseLink: Math.random() < 0.85 ? pick(VENDOR_LINKS) : null,
        status,
        comment: status === "HOLD" ? pick(HOLD_COMMENTS) : null,
        isSnack,
        departmentId,
        requesterId,
        requestedAt: pastDate(60),
      },
    });
  }
}

async function main() {
  const adminPasswordHash = await bcrypt.hash("admin1234", 10);

  await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      username: "admin",
      passwordHash: adminPasswordHash,
      name: "관리자",
      role: "ADMIN",
    },
  });

  const defaultFields: Record<string, string[]> = {
    NAMETAG: ["이름", "영문이름", "직책"],
    BUSINESSCARD: ["이름", "영문이름", "직책", "휴대폰", "이메일"],
    UNIFORM: ["성명", "성별", "사이즈", "입사예정일"],
  };
  for (const [formType, labels] of Object.entries(defaultFields)) {
    const existing = await prisma.cardRequestField.count({ where: { formType } });
    if (existing > 0) continue;
    for (let i = 0; i < labels.length; i++) {
      await prisma.cardRequestField.create({
        data: { formType, label: labels[i], order: i },
      });
    }
  }

  const allDepartmentIds: string[] = [];

  for (const branchName of BRANCHES) {
    const branch = await prisma.branch.upsert({
      where: { name: branchName },
      update: {},
      create: { name: branchName },
    });

    for (const centerName of CENTERS) {
      const center = await prisma.center.upsert({
        where: { branchId_name: { branchId: branch.id, name: centerName } },
        update: {},
        create: { branchId: branch.id, name: centerName },
      });

      const deptNames = DEPARTMENTS_BY_CENTER[centerName] ?? [centerName];

      for (const deptName of deptNames) {
        const existingDept = await prisma.department.findUnique({
          where: { centerId_name: { centerId: center.id, name: deptName } },
        });
        const snackEnabled = existingDept ? existingDept.snackEnabled : Math.random() < 0.4;
        const dept = await prisma.department.upsert({
          where: { centerId_name: { centerId: center.id, name: deptName } },
          update: {},
          create: { centerId: center.id, name: deptName, snackEnabled },
        });

        const username = `${branchName}_${centerName}_${deptName}`;
        const passwordHash = await bcrypt.hash("1234", 10);

        const user = await prisma.user.upsert({
          where: { username },
          update: {},
          create: {
            username,
            passwordHash,
            name: `${branchName} ${centerName} ${deptName}`,
            role: "DEPARTMENT",
            departmentId: dept.id,
          },
        });

        await seedDemoOrders(dept.id, user.id, `${branchName} ${deptName}`, dept.snackEnabled);
        allDepartmentIds.push(dept.id);
      }
    }
  }

  // 데모 예산: 약 70%만 설정, 나머지는 "미설정" 상태로 남겨 기능을 바로 확인할 수 있게 함
  const month = currentMonth();
  for (const departmentId of allDepartmentIds) {
    const existing = await prisma.budget.findUnique({
      where: { departmentId_yearMonth_category: { departmentId, yearMonth: month, category: "GENERAL" } },
    });
    if (existing) continue;
    if (Math.random() < 0.7) {
      await prisma.budget.create({
        data: {
          departmentId,
          yearMonth: month,
          category: "GENERAL",
          amount: randomInt(20, 200) * 10000,
        },
      });
    }

    const dept = await prisma.department.findUnique({ where: { id: departmentId } });
    if (dept?.snackEnabled) {
      const existingSnack = await prisma.budget.findUnique({
        where: { departmentId_yearMonth_category: { departmentId, yearMonth: month, category: "SNACK" } },
      });
      if (!existingSnack && Math.random() < 0.7) {
        await prisma.budget.create({
          data: { departmentId, yearMonth: month, category: "SNACK", amount: randomInt(5, 30) * 10000 },
        });
      }
    }
  }

  console.log("Seed complete. Admin login: admin / admin1234");
  console.log("Department login example: 종로_피부_피부코디 / 1234");
  console.log(`Demo orders seeded for ${allDepartmentIds.length} departments (~10 each).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
