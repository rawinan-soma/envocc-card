import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.ministries.createMany({
    data: [
      {
        ministry_id: 15000,
        ministry_name_th: 'กระทรวงสาธารณสุข',
        ministry_name_eng: 'Ministry of Public Health',
      },
      {
        ministry_id: 21000,
        ministry_name_th: 'กระทรวงมหาดไทย',
        ministry_name_eng: 'Ministry of Interior',
      },
    ],
  });

  await prisma.access_levels.createMany({
    data: [
      { level_id: 1 },
      { level_id: 2 },
      { level_id: 3 },
      { level_id: 4 },
      { level_id: 5 },
    ],
  });

  await prisma.seals.createMany({
    data: [
      {
        seal_id: 1,
        seal_pix: 'seal1.jpg',
      },
      {
        seal_id: 2,
        seal_pix: 'seal2.jpg',
      },
      {
        seal_id: 3,
        seal_pix: 'seal3.jpg',
      },
      {
        seal_id: 4,
        seal_pix: 'seal4.jpg',
      },
      {
        seal_id: 5,
        seal_pix: 'seal5.jpg',
      },
      {
        seal_id: 6,
        seal_pix: 'seal6.jpg',
      },
    ],
  });

  await prisma.departments.createMany({
    data: [
      {
        department_id: 21002,
        department_name_th: 'สำนักงานปลัดกระทรวงสาธารณสุข',
        department_name_eng: 'engname',
        department_seal: 1,
        ministry: 15000,
      },
      {
        department_id: 21003,
        department_name_th: 'กรมการแพทย์',
        department_name_eng: 'engname',
        department_seal: 2,
        ministry: 15000,
      },
      {
        department_id: 21004,
        department_name_th: 'กรมควบคุมโรค',
        department_name_eng: 'engname',
        department_seal: 3,
        ministry: 15000,
      },
      {
        department_id: 21009,
        department_name_th: 'กรมอนามัย',
        department_name_eng: 'engname',
        department_seal: 4,
        ministry: 15000,
      },
      {
        department_id: 10000,
        department_name_th: 'สำนักอนามัย',
        department_name_eng: 'engname',
        department_seal: 5,
        ministry: 21000,
      },
      {
        department_id: 10001,
        department_name_th: 'เทศบาล',
        department_name_eng: 'engname',
        department_seal: 6,
        ministry: 21000,
      },
    ],
  });

  await prisma.institutions.createMany({
    data: [
      {
        institution_id: 1,
        institution_code: 'envocc001',
        institution_name_th: 'สำนักอนามัย',
        institution_name_eng: 'ENG_สำนักอนามัย',
        department: 10000,
        province: 13,
        health_region: 1,
      },
      {
        institution_id: 2,
        institution_code: 'envocc002',
        institution_name_th: 'เทศบาลบางบ่อ',
        institution_name_eng: 'ENG_เทศบาลบางบ่อ',
        department: 10001,
        province: 11,
        health_region: 2,
      },
      {
        institution_id: 3,
        institution_code: 'envocc003',
        institution_name_th: 'เทศบาลลาดหลุมแก้ว',
        institution_name_eng: 'ENG_เทศบาลลาดหลุมแก้ว',
        department: 10001,
        province: 10,
        health_region: 3,
      },
      {
        institution_id: 4,
        institution_code: 'envocc004',
        institution_name_th: 'ผู้บริหาร กระทรวงมหาดไทย',
        institution_name_eng: 'ENG_ผู้บริหาร กระทรวงมหาดไทย',
        department: 10001,
        province: 9,
        health_region: 5,
      },
      {
        institution_id: 5,
        institution_code: 'envocc005',
        institution_name_th: 'ผู้บริหาร',
        institution_name_eng: 'ENG_ผู้บริหาร',
        department: 21002,
        province: 12,
        health_region: 4,
      },
      {
        institution_id: 6,
        institution_code: 'IA0041129',
        institution_name_th: 'กองตรวจราชการ',
        institution_name_eng: 'ENG_กองตรวจราชการ',
        department: 21002,
        province: 12,
        health_region: 4,
      },
      {
        institution_id: 7,
        institution_code: 'envocc006',
        institution_name_th: 'กองตรวจราชการ เขตสุขภาพที่ 1',
        institution_name_eng: 'ENG_กองตรวจราชการ เขตสุขภาพที่ 1',
        department: 21002,
        province: 12,
        health_region: 4,
      },
      {
        institution_id: 8,
        institution_code: 'envocc007',
        institution_name_th: 'กองตรวจราชการ เขตสุขภาพที่ 2',
        institution_name_eng: 'ENG_กองตรวจราชการ เขตสุขภาพที่ 2',
        department: 21002,
        province: 12,
        health_region: 4,
      },
      {
        institution_id: 9,
        institution_code: 'envocc008',
        institution_name_th: 'กองตรวจราชการ เขตสุขภาพที่ 3',
        institution_name_eng: 'ENG_กองตรวจราชการ เขตสุขภาพที่ 3',
        department: 21002,
        province: 12,
        health_region: 4,
      },
      {
        institution_id: 10,
        institution_code: 'envocc009',
        institution_name_th: 'กองตรวจราชการ เขตสุขภาพที่ 4',
        institution_name_eng: 'ENG_กองตรวจราชการ เขตสุขภาพที่ 4',
        department: 21002,
        province: 12,
        health_region: 4,
      },
      {
        institution_id: 11,
        institution_code: 'envocc010',
        institution_name_th: 'กองตรวจราชการ เขตสุขภาพที่ 5',
        institution_name_eng: 'ENG_กองตรวจราชการ เขตสุขภาพที่ 5',
        department: 21002,
        province: 12,
        health_region: 4,
      },
      {
        institution_id: 12,
        institution_code: 'envocc011',
        institution_name_th: 'กองตรวจราชการ เขตสุขภาพที่ 6',
        institution_name_eng: 'ENG_กองตรวจราชการ เขตสุขภาพที่ 6',
        department: 21002,
        province: 12,
        health_region: 4,
      },
      {
        institution_id: 13,
        institution_code: 'envocc012',
        institution_name_th: 'กองตรวจราชการ เขตสุขภาพที่ 7',
        institution_name_eng: 'ENG_กองตรวจราชการ เขตสุขภาพที่ 7',
        department: 21002,
        province: 12,
        health_region: 4,
      },
      {
        institution_id: 14,
        institution_code: 'envocc013',
        institution_name_th: 'กองตรวจราชการ เขตสุขภาพที่ 8',
        institution_name_eng: 'ENG_กองตรวจราชการ เขตสุขภาพที่ 8',
        department: 21002,
        province: 12,
        health_region: 4,
      },
      {
        institution_id: 15,
        institution_code: 'envocc014',
        institution_name_th: 'กองตรวจราชการ เขตสุขภาพที่ 9',
        institution_name_eng: 'ENG_กองตรวจราชการ เขตสุขภาพที่ 9',
        department: 21002,
        province: 12,
        health_region: 4,
      },
      {
        institution_id: 16,
        institution_code: 'envocc015',
        institution_name_th: 'กองตรวจราชการ เขตสุขภาพที่ 10',
        institution_name_eng: 'ENG_กองตรวจราชการ เขตสุขภาพที่ 10',
        department: 21002,
        province: 12,
        health_region: 4,
      },
      {
        institution_id: 17,
        institution_code: 'envocc016',
        institution_name_th: 'กองตรวจราชการ เขตสุขภาพที่ 11',
        institution_name_eng: 'ENG_กองตรวจราชการ เขตสุขภาพที่ 11',
        department: 21002,
        province: 12,
        health_region: 4,
      },
      {
        institution_id: 18,
        institution_code: 'envocc017',
        institution_name_th: 'กองตรวจราชการ เขตสุขภาพที่ 12',
        institution_name_eng: 'ENG_กองตรวจราชการ เขตสุขภาพที่ 12',
        department: 21002,
        province: 12,
        health_region: 4,
      },
      {
        institution_id: 19,
        institution_code: 'envocc018',
        institution_name_th: 'กองตรวจราชการ เขตสุขภาพที่ 13',
        institution_name_eng: 'ENG_กองตรวจราชการ เขตสุขภาพที่ 13',
        department: 21002,
        province: 12,
        health_region: 4,
      },
      {
        institution_id: 20,
        institution_code: 'IA0041117',
        institution_name_th: 'สำนักงานเขตสุขภาพที่ 12',
        institution_name_eng: 'ENG_สำนักงานเขตสุขภาพที่ 12',
        department: 21002,
        province: 12,
        health_region: 4,
      },
      {
        institution_id: 21,
        institution_code: 'IA0041140',
        institution_name_th: 'กองสาธารณสุขฉุกเฉิน (กธฉ.)',
        institution_name_eng: 'ENG_กองสาธารณสุขฉุกเฉิน (กธฉ.)',
        department: 21002,
        province: 12,
        health_region: 4,
      },
      {
        institution_id: 22,
        institution_code: 'envocc019',
        institution_name_th: 'ผู้บริหาร  กรมการแพทย์',
        institution_name_eng: 'ENG_ผู้บริหาร  กรมการแพทย์',
        department: 21003,
        province: 12,
        health_region: 4,
      },
      {
        institution_id: 23,
        institution_code: 'IA0041149',
        institution_name_th: 'สำนักงานเลขานุการกรม กรมการแพทย์',
        institution_name_eng: 'ENG_สำนักงานเลขานุการกรม กรมการแพทย์',
        department: 21003,
        province: 12,
        health_region: 4,
      },
      {
        institution_id: 24,
        institution_code: 'IA0041146',
        institution_name_th: 'สำนักดิจิทัลการแพทย์ กรมการแพทย์',
        institution_name_eng: 'ENG_สำนักดิจิทัลการแพทย์ กรมการแพทย์',
        department: 21003,
        province: 12,
        health_region: 4,
      },
      {
        institution_id: 25,
        institution_code: 'IA0041156',
        institution_name_th: 'สำนักนิเทศระบบการแพทย์ กรมการแพทย์',
        institution_name_eng: 'ENG_สำนักนิเทศระบบการแพทย์ กรมการแพทย์',
        department: 21003,
        province: 12,
        health_region: 4,
      },
      {
        institution_id: 26,
        institution_code: 'IA0041152',
        institution_name_th: 'กลุ่มตรวจสอบภายใน กรมการแพทย์',
        institution_name_eng: 'ENG_กลุ่มตรวจสอบภายใน กรมการแพทย์',
        department: 21003,
        province: 12,
        health_region: 4,
      },
      {
        institution_id: 27,
        institution_code: 'envocc020',
        institution_name_th: 'ผู้บริหาร  กรมควบคุมโรค',
        institution_name_eng: 'ENG_ผู้บริหาร  กรมควบคุมโรค',
        department: 21004,
        province: 12,
        health_region: 4,
      },
      {
        institution_id: 28,
        institution_code: 'IA0041174',
        institution_name_th: 'กองโรคจากการประกอบอาชีพและสิ่งแวดล้อม',
        institution_name_eng: 'ENVOCC',
        department: 21004,
        province: 12,
        health_region: 4,
      },
      {
        institution_id: 29,
        institution_code: 'IA0041159',
        institution_name_th: 'กองยุทธศาสตร์และแผนงาน',
        institution_name_eng: 'ENG_กองยุทธศาสตร์และแผนงาน',
        department: 21004,
        province: 12,
        health_region: 4,
      },
      {
        institution_id: 30,
        institution_code: 'IA0041160',
        institution_name_th: 'กองบริหารทรัพยากรบุคคล',
        institution_name_eng: 'ENG_กองบริหารทรัพยากรบุคคล',
        department: 21004,
        province: 12,
        health_region: 4,
      },
      {
        institution_id: 31,
        institution_code: 'IA0041163',
        institution_name_th: 'กองกฎหมาย',
        institution_name_eng: 'ENG_กองกฎหมาย',
        department: 21004,
        province: 12,
        health_region: 4,
      },
      {
        institution_id: 32,
        institution_code: 'IA0041169',
        institution_name_th: 'กองโรคติดต่อทั่วไป',
        institution_name_eng: 'ENG_กองโรคติดต่อทั่วไป',
        department: 21004,
        province: 12,
        health_region: 4,
      },
      {
        institution_id: 33,
        institution_code: 'envocc021',
        institution_name_th: 'ผู้บริหาร  อนามัย',
        institution_name_eng: 'ENG_ผู้บริหาร  อนามัย',
        department: 21009,
        province: 12,
        health_region: 4,
      },
      {
        institution_id: 34,
        institution_code: 'IA0041249',
        institution_name_th: 'ศูนย์บริหารกฏหมายสาธารณสุข',
        institution_name_eng: 'ENG_ศูนย์บริหารกฏหมายสาธารณสุข',
        department: 21009,
        province: 12,
        health_region: 4,
      },
      {
        institution_id: 35,
        institution_code: 'IA0041242',
        institution_name_th: 'กองคลังกรมอนามัย',
        institution_name_eng: 'ENG_กองคลังกรมอนามัย',
        department: 21009,
        province: 12,
        health_region: 4,
      },
    ],
  });

  await prisma.positions.createMany({
    data: [
      {
        position_id: 1,
        position_name: 'นายแพทย์',
        position_name_eng: 'Medical Physician',
      },
      {
        position_id: 2,
        position_name: 'เภสัชกร',
        position_name_eng: 'Pharmacist',
      },
      {
        position_id: 3,
        position_name: 'พยาบาลวิชาชีพ',
        position_name_eng: 'Registered Nurse',
      },
      {
        position_id: 4,
        position_name: 'นักวิชาการสาธารณสุข',
        position_name_eng: 'Public Health Technical Officer',
      },
      {
        position_id: 5,
        position_name: 'นักวิชาการสุขาภิบาล',
        position_name_eng: 'Sanitation Technical Officer',
      },
      {
        position_id: 6,
        position_name: 'นักวิทยาศาสตร์การแพทย์',
        position_name_eng: 'Medical Scientist',
      },
      {
        position_id: 7,
        position_name: 'นักเทคนิคการแพทย์',
        position_name_eng: 'Medical Technologist',
      },
    ],
  });

  await prisma.position_lvs.createMany({
    data: [
      {
        position_lv_id: 1,
        position_lv_name: 'ปฏิบัติการ',
        position_lv_name_eng: 'Practioner level',
      },
      {
        position_lv_id: 2,
        position_lv_name: 'ชำนาญการ',
        position_lv_name_eng: 'Professional level',
      },
      {
        position_lv_id: 3,
        position_lv_name: 'ชำนาญการพิเศษ',
        position_lv_name_eng: 'Senior Professional level',
      },
      {
        position_lv_id: 4,
        position_lv_name: 'เชี่ยวญชาญ',
        position_lv_name_eng: 'Expert level',
      },
      {
        position_lv_id: 5,
        position_lv_name: 'ทรงคุณวุฒิ',
        position_lv_name_eng: 'Advisory level',
      },
    ],
  });

  await prisma.admins.create({
    data: {
      email: 'testemail@mainModule.com',
      fname: 'ทดสอบ',
      lname: 'ทดสอบ',
      password: '$2a$10$SOsXUDYPnIcoUZLeZKwMjO1AsS1MEAdUnm2XMcyvO8rpXdl47i/nC',
      pname: 'นาย',
      private_number: '0990000000',
      username: 'test01',
      work_number: '022000000',
      level: 1,
      id: 1,
      create_date: new Date('2024-12-27'),
      institution: 28,
      position_lv: 1,
      position: 4,
      role: 'admin',
    },
  });

  await prisma.epositions.createMany({
    data: [
      {
        eposition_id: 1,
        eposition_name_th: 'ปลัดกระทรวงสาธารณสุข',
        eposition_name_eng: 'ENG_ปลัดกระทรวงสาธารณสุข',
        institution: 5,
      },
      {
        eposition_id: 2,
        eposition_name_th: 'ผู้ตรวจราชการ',
        eposition_name_eng: 'ENG_ผู้ตรวจราชการ',
        institution: 6,
      },
      {
        eposition_id: 3,
        eposition_name_th: 'ผู้ตรวจราชการกระทรวงสาธารณสุข เขตสุขภาพที่ 1',
        eposition_name_eng: 'ENG_ผู้ตรวจราชการกระทรวงสาธารณสุข เขตสุขภาพที่ 1',
        institution: 7,
      },
      {
        eposition_id: 4,
        eposition_name_th: 'ผู้ตรวจราชการกระทรวงสาธารณสุข เขตสุขภาพที่ 2',
        eposition_name_eng: 'ENG_ผู้ตรวจราชการกระทรวงสาธารณสุข เขตสุขภาพที่ 2',
        institution: 8,
      },
      {
        eposition_id: 5,
        eposition_name_th: 'ผู้ตรวจราชการกระทรวงสาธารณสุข เขตสุขภาพที่ 3',
        eposition_name_eng: 'ENG_ผู้ตรวจราชการกระทรวงสาธารณสุข เขตสุขภาพที่ 3',
        institution: 9,
      },
      {
        eposition_id: 6,
        eposition_name_th: 'ผู้ตรวจราชการกระทรวงสาธารณสุข เขตสุขภาพที่ 4',
        eposition_name_eng: 'ENG_ผู้ตรวจราชการกระทรวงสาธารณสุข เขตสุขภาพที่ 4',
        institution: 10,
      },
      {
        eposition_id: 7,
        eposition_name_th: 'ผู้ตรวจราชการกระทรวงสาธารณสุข เขตสุขภาพที่ 5',
        eposition_name_eng: 'ENG_ผู้ตรวจราชการกระทรวงสาธารณสุข เขตสุขภาพที่ 5',
        institution: 11,
      },
      {
        eposition_id: 8,
        eposition_name_th: 'ผู้ตรวจราชการกระทรวงสาธารณสุข เขตสุขภาพที่ 6',
        eposition_name_eng: 'ENG_ผู้ตรวจราชการกระทรวงสาธารณสุข เขตสุขภาพที่ 6',
        institution: 12,
      },
      {
        eposition_id: 9,
        eposition_name_th: 'ผู้ตรวจราชการกระทรวงสาธารณสุข เขตสุขภาพที่ 7',
        eposition_name_eng: 'ENG_ผู้ตรวจราชการกระทรวงสาธารณสุข เขตสุขภาพที่ 7',
        institution: 13,
      },
      {
        eposition_id: 10,
        eposition_name_th: 'ผู้ตรวจราชการกระทรวงสาธารณสุข เขตสุขภาพที่ 8',
        eposition_name_eng: 'ENG_ผู้ตรวจราชการกระทรวงสาธารณสุข เขตสุขภาพที่ 8',
        institution: 14,
      },
      {
        eposition_id: 11,
        eposition_name_th: 'ผู้ตรวจราชการกระทรวงสาธารณสุข เขตสุขภาพที่ 9',
        eposition_name_eng: 'ENG_ผู้ตรวจราชการกระทรวงสาธารณสุข เขตสุขภาพที่ 9',
        institution: 15,
      },
      {
        eposition_id: 12,
        eposition_name_th: 'ผู้ตรวจราชการกระทรวงสาธารณสุข เขตสุขภาพที่ 10',
        eposition_name_eng: 'ENG_ผู้ตรวจราชการกระทรวงสาธารณสุข เขตสุขภาพที่ 10',
        institution: 16,
      },
      {
        eposition_id: 13,
        eposition_name_th: 'ผู้ตรวจราชการกระทรวงสาธารณสุข เขตสุขภาพที่ 11',
        eposition_name_eng: 'ENG_ผู้ตรวจราชการกระทรวงสาธารณสุข เขตสุขภาพที่ 11',
        institution: 17,
      },
      {
        eposition_id: 14,
        eposition_name_th: 'ผู้ตรวจราชการกระทรวงสาธารณสุข เขตสุขภาพที่ 12',
        eposition_name_eng: 'ENG_ผู้ตรวจราชการกระทรวงสาธารณสุข เขตสุขภาพที่ 12',
        institution: 18,
      },
      {
        eposition_id: 15,
        eposition_name_th: 'ผู้ตรวจราชการกระทรวงสาธารณสุข เขตสุขภาพที่ 13',
        eposition_name_eng: 'ENG_ผู้ตรวจราชการกระทรวงสาธารณสุข เขตสุขภาพที่ 13',
        institution: 19,
      },
      {
        eposition_id: 16,
        eposition_name_th: 'อธิบดีกรมการแพทย์',
        eposition_name_eng: 'ENG_อธิบดีกรมการแพทย์',
        institution: 22,
      },
      {
        eposition_id: 17,
        eposition_name_th: 'อธิบดีกรมควบคุมโรค',
        eposition_name_eng: 'ENG_อธิบดีกรมควบคุมโรค',
        institution: 27,
      },
      {
        eposition_id: 18,
        eposition_name_th: 'อธิบดีกรมอนามัย',
        eposition_name_eng: 'ENG_อธิบดีกรมอนามัย',
        institution: 33,
      },
    ],
  });
}

main()
  .then(async () => {
    console.log('Seeding complete');
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.log(e);
    await prisma.$disconnect();
    process.exit(1);
  });
