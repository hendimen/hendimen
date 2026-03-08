<?php
// register.php
require_once 'config.php';

header('Content-Type: application/json');

// Matikan error reporting untuk production, aktifkan untuk debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);

try {
    // Validasi method
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception('Method tidak diizinkan');
    }

    // Ambil data dari POST
    $role = $_POST['role'] ?? '';
    $nama_lengkap = trim($_POST['nama_lengkap'] ?? '');
    $email = trim($_POST['email'] ?? '');
    $no_telepon = trim($_POST['no_telepon'] ?? '');
    $password = $_POST['password'] ?? '';

    // Validasi input tidak boleh kosong
    if (empty($role) || empty($nama_lengkap) || empty($email) || empty($no_telepon) || empty($password)) {
        throw new Exception('Semua field harus diisi');
    }

    // Validasi role
    if (!in_array($role, ['Helper', 'Requester'])) {
        throw new Exception('Role tidak valid. Harus Helper atau Requester');
    }

    // Validasi email
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        throw new Exception('Format email tidak valid');
    }

    // Validasi password minimal 6 karakter
    if (strlen($password) < 6) {
        throw new Exception('Password minimal 6 karakter');
    }

    // Cek apakah email sudah terdaftar
    $check_email = $conn->prepare("SELECT id FROM users WHERE email = ?");
    $check_email->bind_param("s", $email);
    $check_email->execute();
    $result_email = $check_email->get_result();
    
    if ($result_email->num_rows > 0) {
        throw new Exception('Email sudah terdaftar. Gunakan email lain atau login');
    }
    $check_email->close();

    // Cek apakah nomor telepon sudah terdaftar
    $check_phone = $conn->prepare("SELECT id FROM users WHERE no_telepon = ?");
    $check_phone->bind_param("s", $no_telepon);
    $check_phone->execute();
    $result_phone = $check_phone->get_result();
    
    if ($result_phone->num_rows > 0) {
        throw new Exception('Nomor telepon sudah terdaftar. Gunakan nomor lain atau login');
    }
    $check_phone->close();

    // Hash password
    $hashed_password = password_hash($password, PASSWORD_DEFAULT);

    // Proses upload file KTP (opsional)
    $ktp_file = null;
    if (isset($_FILES['ktp_file']) && $_FILES['ktp_file']['error'] === UPLOAD_ERR_OK) {
        $target_dir = "uploads/ktp/";
        
        // Buat folder jika belum ada
        if (!file_exists($target_dir)) {
            mkdir($target_dir, 0777, true);
        }
        
        $file_extension = strtolower(pathinfo($_FILES['ktp_file']['name'], PATHINFO_EXTENSION));
        $allowed_extensions = ['jpg', 'jpeg', 'png', 'pdf'];
        
        if (!in_array($file_extension, $allowed_extensions)) {
            throw new Exception('File KTP harus berupa JPG, JPEG, PNG, atau PDF');
        }
        
        // Generate nama file unik
        $new_filename = time() . '_' . uniqid() . '.' . $file_extension;
        $target_file = $target_dir . $new_filename;
        
        if (move_uploaded_file($_FILES['ktp_file']['tmp_name'], $target_file)) {
            $ktp_file = $target_file;
        }
    }

    // Insert ke database
    $insert = $conn->prepare("INSERT INTO users (role, nama_lengkap, email, no_telepon, password, ktp_file, wallet_balance) VALUES (?, ?, ?, ?, ?, ?, 0)");
    
    if (!$insert) {
        throw new Exception('Error prepare statement: ' . $conn->error);
    }
    
    $insert->bind_param("ssssss", $role, $nama_lengkap, $email, $no_telepon, $hashed_password, $ktp_file);
    
    if (!$insert->execute()) {
        throw new Exception('Error execute: ' . $insert->error);
    }
    
    $user_id = $insert->insert_id;
    
    // Ambil data user yang baru dibuat
    $select = $conn->prepare("SELECT id, role, nama_lengkap, email, no_telepon, wallet_balance, created_at FROM users WHERE id = ?");
    $select->bind_param("i", $user_id);
    $select->execute();
    $user_data = $select->get_result()->fetch_assoc();
    
    // Buat avatar dari inisial
    $name_parts = explode(' ', $nama_lengkap);
    $avatar = '';
    foreach ($name_parts as $part) {
        if (!empty($part)) {
            $avatar .= strtoupper(substr($part, 0, 1));
        }
    }
    $avatar = substr($avatar, 0, 2);
    
    // Kirim response sukses
    echo json_encode([
        'success' => true,
        'message' => 'Registrasi berhasil! Silakan login',
        'user' => [
            'id' => $user_data['id'],
            'name' => $user_data['nama_lengkap'],
            'email' => $user_data['email'],
            'phone' => $user_data['no_telepon'],
            'role' => strtolower($user_data['role']),
            'avatar' => $avatar,
            'wallet_balance' => $user_data['wallet_balance']
        ]
    ]);

} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
} finally {
    if (isset($insert)) $insert->close();
    if (isset($conn)) $conn->close();
}
?>