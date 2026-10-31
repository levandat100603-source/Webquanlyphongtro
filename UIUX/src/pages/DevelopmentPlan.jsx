import React from 'react';
import plan from '../data/developmentPlan.json';
import './DevelopmentPlan.css';

export default function DevelopmentPlan() {
  return (
    <main className="container development-plan" lang="vi">
      <header className="plan-intro">
        <p className="plan-eyebrow">BIGSIX · THỰC TẬP CHUYÊN NGÀNH</p>
        <h1>Kế hoạch thực hiện</h1>
        <p>Kế hoạch dự kiến xây dựng website phòng trọ trong đồ án cá nhân của Lê Văn Đạt, từ tìm hiểu yêu cầu đến lập trình và chạy thử.</p>
        <div className="plan-facts">
          <span>8 giai đoạn · 17/10–07/12/2026</span>
          <span>Lập ngày 29/10/2026</span>
          <span>Kế hoạch đề xuất</span>
        </div>
      </header>
      <aside className="plan-note">
        <strong>Phạm vi đồ án</strong>
        <p>Phạm vi đồ án gồm tài khoản có OTP email, hồ sơ, tin phòng và bản đồ, tìm kiếm, đặt phòng, duyệt chủ trọ, quản lý tài khoản và các tiện ích giao diện. Em sẽ chạy thử với dữ liệu mẫu trong môi trường học tập. Lịch dưới đây là kế hoạch dự kiến, có thể điều chỉnh theo thời hạn nộp bài của giảng viên.</p>
      </aside>
      <section aria-labelledby="timeline-title">
        <h2 id="timeline-title">Lịch thực hiện dự kiến</h2>
        <ol className="plan-timeline">
          {plan.timeline.map(([week, dates, title, owner, deliverable]) => (
            <li key={week} className="plan-card">
              <div className="plan-week">{week}</div>
              <div>
                <p className="plan-date">{dates}</p>
                <h3>{title}</h3>
                <p><strong>Phụ trách:</strong> {owner}</p>
                <p><strong>Kết quả cần đạt:</strong> {deliverable}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>
      <section aria-labelledby="team-title">
        <h2 id="team-title">Các công việc cá nhân phụ trách</h2>
        <p>Em, Lê Văn Đạt, sẽ thực hiện đồ án một mình. Công việc dự kiến được chia thành các phần dưới đây để dễ theo dõi và tự kiểm tra.</p>
        <div className="plan-table-scroll" role="region" aria-label="Bảng công việc cá nhân" tabIndex={0}>
          <table className="plan-table">
            <caption>Các phần việc do Lê Văn Đạt thực hiện</caption>
            <thead><tr>{['Người thực hiện', 'Phần việc', 'Công việc cụ thể', 'Cách tự kiểm tra'].map(label => <th key={label} scope="col">{label}</th>)}</tr></thead>
            <tbody>{plan.members.map(row => <tr key={row[1]}>{row.map((cell, i) => i === 1 ? <th key={i} scope="row">{cell}</th> : <td key={i}>{cell}</td>)}</tr>)}</tbody>
          </table>
        </div>
      </section>
      <section className="plan-note" aria-labelledby="milestones-title">
        <h2 id="milestones-title">Theo dõi tiến độ và kiểm tra kết quả</h2>
        <p>17–30/10: tìm hiểu yêu cầu và thiết kế. 31/10–27/11: tạo dự án, lập trình và kết nối các chức năng. 28/11–04/12: chạy thử và sửa lỗi. 05–07/12: hoàn thiện báo cáo, chuẩn bị trình bày và nộp bài.</p>
        <p>Công việc được theo dõi theo các trạng thái Chưa làm → Đang làm → Cần kiểm tra → Hoàn thành. Cuối mỗi tuần, em kiểm tra tiến độ và điều chỉnh lịch thực hiện; khi gặp khó khăn, em tìm hiểu tài liệu và trao đổi với giảng viên hướng dẫn.</p>
        <p>Em dự kiến làm từng chức năng rồi chạy thử ngay với dữ liệu mẫu. Bản đồ, OTP email, Việt/Anh và sáng/tối nằm trong phạm vi chức năng; thanh toán, hợp đồng điện tử và chat nội bộ chưa nằm trong phiên bản này. Khi kiểm tra, em sẽ ghi lại cả những giới hạn như chưa chặn đặt trùng và hủy đơn hiện xóa lịch sử, không tính các phần đó là đã hoàn thiện.</p>
      </section>
    </main>
  );
}
