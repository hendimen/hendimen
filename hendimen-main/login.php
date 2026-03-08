<?php
// login.php
require_once 'config.php';

header('Content-Type: application/json');

// Aktifkan error reporting untuk debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);

try {
    // Validasi method
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception('Method tidak diizinkan');
    }

    // Ambil data login
    $input = trim($_POST['email'] ?? '');
    $password = $_POST['password'] ?? '';

    // Validasi input
    if (empty($input) || empty($password)) {
        throw new Exception('Email/No Telepon dan password harus diisi');
    }

    // Tentukan apakah input adalah email atau no telepon
    $is_email = filter_var($input, FILTER_VALIDATE_EMAIL);
    
    // Query berdasarkan tipe input
    if ($is_email) {
        $query = "SELECT * FROM users WHERE email = ?";
    } else {
        $query = "SELECT * FROM users WHERE no_telepon = ?";
    }
    
    $stmt = $conn->prepare($query);
    
    if (!$stmt) {
        throw new Exception('Error prepare statement: ' . $conn->error);
    }
    
    $stmt->bind_param("s", $input);
    
    if (!$stmt->execute()) {
        throw new Exception('Error execute statement: ' . $stmt->error);
    }
    
    $result = $stmt->get_result();
    
    // Cek apakah user ditemukan
    if ($result->num_rows === 0) {
        throw new Exception('Email/No Telepon tidak terdaftar');
    }
    
    $user = $result->fetch_assoc();
    
    // Verifikasi password
    if (!password_verify($password, $user['password'])) {
        throw new Exception('Password salah');
    }
    
    // Buat avatar dari inisial nama
    $name_parts = explode(' ', $user['nama_lengkap']);
    $avatar = '';
    foreach ($name_parts as $part) {
        if (!empty($part)) {
            $avatar .= strtoupper(substr($part, 0, 1));
        }
    }
    $avatar = substr($avatar, 0, 2) ?: 'U';
    
    // Login sukses
    echo json_encode([
        'success' => true,
        'message' => 'Login berhasil',
        'user' => [
            'id' => $user['id'],
            'name' => $user['nama_lengkap'],
            'email' => $user['email'],
            'phone' => $user['no_telepon'],
            'role' => strtolower($user['role']),
            'avatar' => $avatar,
            'wallet_balance' => $user['wallet_balance']
        ]
    ]);

} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
} finally {
    if (isset($stmt)) $stmt->close();
    if (isset($conn)) $conn->close();
}
?>