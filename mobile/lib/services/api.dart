import 'dart:async';
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:web_socket_channel/web_socket_channel.dart';

/// Backend manzili: telefon va server bir Wi-Fi da bo'lsa kompyuter IP si.
/// Android emulyatorida: http://10.0.2.2:3000
const String kBaseUrl = String.fromEnvironment('API_URL', defaultValue: 'http://10.0.2.2:3000');
const String kToken = String.fromEnvironment('API_TOKEN', defaultValue: '');

class Device {
  final String id, room, kind;
  final Map<String, dynamic> name;
  final bool on, online, essential;
  final double watts, ratedWatts;
  Device(this.id, this.room, this.kind, this.name, this.on, this.online, this.essential, this.watts, this.ratedWatts);

  factory Device.fromJson(Map<String, dynamic> j) => Device(
        j['id'], j['room'], j['kind'], j['name'],
        j['on'] == true, j['online'] == true, j['essential'] == true,
        (j['watts'] ?? 0).toDouble(), (j['ratedWatts'] ?? 0).toDouble(),
      );
  Device copyWith({bool? on, double? watts, bool? online}) =>
      Device(id, room, kind, name, on ?? this.on, online ?? this.online, essential, watts ?? this.watts, ratedWatts);
}

class Room {
  final String id;
  final Map<String, dynamic> name;
  Room(this.id, this.name);
}

class Alert {
  final String message, level;
  Alert(this.message, this.level);
}

class Api {
  final _h = {'Authorization': 'Bearer $kToken', 'Content-Type': 'application/json'};
  Uri _u(String p, [Map<String, String>? q]) => Uri.parse('$kBaseUrl$p').replace(queryParameters: q);

  Future<Map<String, dynamic>> home() async =>
      jsonDecode((await http.get(_u('/api/home'), headers: _h)).body);

  Future<void> power(String id, bool on) async {
    final response = await http.post(_u('/api/devices/$id/power'), headers: _h, body: jsonEncode({'on': on})).timeout(const Duration(seconds: 10));
    if (response.statusCode != 202 && response.statusCode != 200) {
      final message = response.body.isNotEmpty ? response.body : 'HTTP ${response.statusCode}';
      throw StateError('Qurilma buyrug‘i yuborilmadi: $message');
    }
  }

  Future<Map<String, dynamic>> energy(String lang) async =>
      jsonDecode((await http.get(_u('/api/energy', {'lang': lang}), headers: _h)).body);

  Future<List<dynamic>> scenes() async =>
      jsonDecode((await http.get(_u('/api/scenes'), headers: _h)).body);

  Future<void> runScene(String id) => http.post(_u('/api/scenes/$id/run'), headers: _h);

  /// Ovozdan olingan matnni backend NLU ga yuboradi.
  Future<Map<String, dynamic>> voice(String text) async => jsonDecode(utf8.decode(
      (await http.post(_u('/api/voice'), headers: _h, body: jsonEncode({'text': text}))).bodyBytes));

  /// Real-vaqt yangilanishlar (holat, ogohlantirishlar).
  Future<WebSocketChannel> live() async {
    if (kToken.isEmpty) throw StateError('API_TOKEN berilmagan. --dart-define=API_TOKEN=... orqali sozlang.');
    final response = await http.post(_u('/api/ws-ticket'), headers: _h).timeout(const Duration(seconds: 10));
    if (response.statusCode != 200) throw StateError('WebSocket ticket olinmadi: ${response.statusCode}');
    final data = jsonDecode(response.body) as Map<String, dynamic>;
    final ticket = data['ticket'] as String?;
    if (ticket == null || ticket.isEmpty) throw StateError('Server WebSocket ticket qaytarmadi');
    final wsBase = kBaseUrl.startsWith('https:')
        ? kBaseUrl.replaceFirst('https:', 'wss:')
        : kBaseUrl.replaceFirst('http:', 'ws:');
    return WebSocketChannel.connect(Uri.parse('$wsBase/ws?ticket=${Uri.encodeQueryComponent(ticket)}'));
  }
}
